(function(){

    angular.module('grid', []);

    angular.module('grid')
        .controller('GridController', ['$scope', '$mdToast', 'firebaseService', GridController]);

    function GridController($scope, $mdToast, firebaseService) {
        var K = 5;
        var states = ['#7E57C2', '#4CAF50', '#FFB300'];

        $scope.K = function() { return K; };

        var tryApply = function() {
            if(!$scope.$$phase) { $scope.$apply(); }
        };

        var errorToast = function() {
            $mdToast.show(
                $mdToast.simple()
                    .content('Error syncing with server')
                    .position('bottom right')
                    .hideDelay(3000)
                    .theme('error-toast')
            );
        };

        var nextState = function(state) {
            var next = 0;
            for(var i = 0; i < states.length; i++) {
                if(state == states[i]) {
                    next = i + 1;
                }
            }
            if(next >= states.length) {
                next = 0;
            }

            return states[next];
        };

        $scope.iterateState = function(item) {

            if(!firebaseService.isConnected()) {
                errorToast();
                return;
            }

            // copy item for 2 reasons
            // 1: angular objects have $$hashCode property which doesn't play nice with firebase
            // 2: Don't want to update the object proper until we get the update from
            //    firebase that set() operation was a success
            var copy = { id: item.id, state: nextState(item.state) };

            if(!firebaseRefs[item.id]) {
                firebaseRefs[item.id] = firebaseService.grid.child(item.id.toString());
            }
            firebaseRefs[item.id].set(copy, function(error) {
                if(error) {
                    errorToast();
                }
                else {
                    item.state = copy.state;
                    tryApply();
                }
            });
        };

        // Load data from firebase
        var items = [];
        var firebaseRefs = [];

        for(var i = 0; i < K * K * 2; i++ ) {
            items.push({
                id: i,
                state: states[0]
            });
        }
        firebaseService.grid.on('child_added', function(snapshot, prevChild) {
            var item = snapshot.val();
            if (items.length > item.id) {
                items[item.id].state = item.state;
            }
            tryApply();
        });
        firebaseService.grid.on('child_changed', function(snapshot, prevChild) {
            var item = snapshot.val();
            items[item.id].state = item.state;
            tryApply();
        });

        $scope.items = items;
    }
})();