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

        var fireError = function(error) {
            if(error) {
                $mdToast.show(
                    $mdToast.simple()
                        .content('Error syncing with server')
                        .position('bottom right')
                        .hideDelay(3000)
                        .theme('error-toast')
                );
            }
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

        var save = function(item, newState) {
            if(!firebaseService.isConnected()) {
                fireError(true);
                return;
            }

            // copy item for 2 reasons
            // 1: angular objects have $$hashCode property which doesn't play nice with firebase
            // 2: Don't want to update the object proper until we get the update from
            //    firebase that set() operation was a success
            var copy = { id: item.id, state: newState };

            if(!firebaseRefs[item.id]) {
                firebaseRefs[item.id] = firebaseService.grid.child(item.id);
            }
            firebaseRefs[item.id].set(copy, fireError);
        };

        $scope.iterateState = function(item) {

            save(item, nextState(item.state));
        };

        $scope.clear = function() {
            for(var it in items) {
                save(items[it], states[0]);
            }
        };

        var blitzStart = 0;
        var blitzCancel = null;
        var blitzDuration = 2000;
        $scope.blitz = function() {
            blitzStart = Date.now();
            clearBlitz();
            blitzCancel = setInterval(executeBlitz, 10);
        };

        var executeBlitz = function() {
            if(!firebaseService.isConnected()) {
                fireError(true);
                clearBlitz();
                return;
            }
            if(blitzStart < Date.now() - 2000) {
                clearBlitz();
                return;
            }

            var idx = Math.floor(Math.random() * items.length);
            console.log(idx);
            $scope.iterateState(items[idx]);
        };

        var clearBlitz = function() {
            if(blitzCancel) {
                clearInterval(blitzCancel);
            }
            blitzCancel = null;
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