(function(){

    angular.module('nav', []);

    angular.module('nav')
        .controller('NavController', ['$scope', '$mdSidenav', 'firebaseService', '$location', NavController]);

    function NavController($scope, $mdSidenav, firebaseService, $location) {
        $scope.go = function(path) {
            $location.path(path)
        };

        $scope.at = function(path) {
            return $location.path() === path;
        };

        $scope.connected = false;

        firebaseService.connection.on("value", function(snap) {
            $scope.connected = (snap.val() === true);
            if(!$scope.$$phase) { $scope.$apply(); }
        });

        $scope.toggleNav = function() {
            $mdSidenav('left').toggle();
        }
    }
})();