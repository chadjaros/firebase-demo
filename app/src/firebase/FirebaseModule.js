(function(){

    var appName = 'chadjaros-demo';
    
    angular.module('firebase', []);

    angular.module('firebase')
        .service('firebaseService', [FirebaseService]);

    function FirebaseService() {

        var conn = new Firebase('https://'+appName+'.firebaseio.com/.info/connected');
        var isConn = false;

        conn.on('value', function(snap) {
            isConn = (snap.val() === true);
        });

        return {
            grid: new Firebase('https://'+appName+'.firebaseio.com/grid'),
            draw: new Firebase('https://'+appName+'.firebaseio.com/draw'),
            connection: conn,
            isConnected: function() {
                return isConn;
            }
        };
    }
})();