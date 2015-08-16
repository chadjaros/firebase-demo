(function(){

    angular.module('draw', []);

    angular.module('draw')
        .controller('DrawController', ['$scope', function($scope) {}]);

    angular.module('draw')
        .directive("fireDraw", ['firebaseService', '$mdToast', function(firebaseService, $mdToast){
            return {
                restrict: "E",
                templateUrl: 'src/draw/fire-draw-template.html',
                link: function($scope, element){

                    $scope.TOOL_ERASER = function() { return 'eraser' };
                    $scope.TOOL_DRAW = function() { return 'draw' };
                    $scope.currentTool = $scope.TOOL_DRAW();

                    var canvas = $(element).find('canvas').get(0);
                    var ctx = canvas.getContext('2d');

                    ctx.lineWidth = 1.5;

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

                    var clear = function() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    };

                    var drawLine = function(p0, p1, tempStyle, tempWidth) {
                        var baseStyle = ctx.strokeStyle;
                        var baseWidth = ctx.lineWidth;

                        if(tempStyle) {
                            ctx.strokeStyle = tempStyle;
                        }
                        if(tempWidth) {
                            ctx.lineWidth = tempWidth;
                        }
                        ctx.beginPath();
                        ctx.moveTo(p0.x, p0.y);
                        ctx.lineTo(p1.x, p1.y);
                        ctx.stroke();

                        ctx.strokeStyle = baseStyle;
                        ctx.lineWidth = baseWidth;
                    };

                    var drawCurve = function(curve){
                        ctx.beginPath();
                        ctx.moveTo(curve.p0.x, curve.p0.y);
                        ctx.bezierCurveTo(curve.p1.x, curve.p1.y, curve.p2.x, curve.p2.y, curve.p3.x, curve.p3.y);
                        ctx.stroke();
                    };

                    // Erases the first curve that intersects this point
                    var eraseCurve = function(point) {
                        for(var key in curves) {
                            if(intersects(point, curves[key])) {
                                if(firebaseService.isConnected()) {
                                    firebaseService.draw.child(key).remove(fireError);
                                }
                                else {
                                    fireError(true);
                                }
                                return;
                            }
                        }
                    };

                    var intersects = function(point, curve) {
                        var result = jsBezier.distanceFromCurve(
                            point,
                            [curve.p0, curve.p1, curve.p2, curve.p3]
                        );

                        return result.distance <= 2;
                    };

                    // variable that decides if something should be drawn on mousemove
                    var drawing = false;
                    var newCurve = {};
                    var curves = {};

                    var redrawAll = function() {
                        clear();
                        for(var key in curves) {
                            drawCurve(curves[key]);
                        }
                        if(drawing) {
                            drawProgress(newCurve);
                        }
                    };

                    var drawProgress = function(partial) {
                        var color = '#4DD0E1';
                        drawLine(partial.p1, flipPoint(partial.p1, partial.p0), color,.5);
                        if(drawing === 'p0') {
                            drawLine(partial.p0, partial.p1);
                        }
                        else {
                            drawLine(partial.p2, flipPoint(partial.p2, partial.p3), color,.5);
                            drawCurve(partial);
                        }
                    };

                    firebaseService.draw.on("child_added", function(item) {
                        curves[item.key()] = item.val();
                        redrawAll();
                    });
                    firebaseService.draw.on("child_removed", function(item) {
                        delete curves[item.key()];
                        redrawAll();
                    });


                    var extractPoint = function(event) {
                        if(event.offsetX !== undefined){
                            return {
                                x: event.offsetX,
                                y: event.offsetY
                            };
                        } else { // Firefox compatibility
                            return {
                                x: event.layerX - event.currentTarget.offsetLeft,
                                y: event.layerY - event.currentTarget.offsetTop
                            };
                        }
                    };

                    // Returns a point that has been flipped on the X and Y
                    // axis about the origin point.
                    var flipPoint = function(point, origin) {
                        var dx = origin.x - point.x;
                        var dy = origin.y - point.y;
                        return result = {
                            x: origin.x + dx,
                            y: origin.y + dy
                        };
                    };

                    $(canvas).on('mousedown', function(event){
                        var point = extractPoint(event);
                        if($scope.currentTool === $scope.TOOL_DRAW()) {
                            if (!newCurve.p3) {
                                newCurve.p0 = point;
                                newCurve.p1 = point;
                                drawing = 'p0';
                            }
                            else {
                                newCurve.p2 = point;
                                newCurve.p3 = point;
                                drawing = 'p2';
                            }
                        }
                        else {
                            drawing = false;
                            newCurve = {};
                            eraseCurve(point);
                        }
                    });

                    $(canvas).on('mouseup', function(event){
                        var point = extractPoint(event);
                        if($scope.currentTool === $scope.TOOL_DRAW()) {
                            if(!newCurve.p0) {
                                newCurve = {};
                                drawing = false;
                            }
                            else if (!newCurve.p3) {
                                newCurve.p1 = point;
                                newCurve.p2 = point;
                                newCurve.p3 = point;
                                drawing = 'p3';
                            }
                            else {
                                drawing = false;
                                if(firebaseService.isConnected()) {
                                    firebaseService.draw.push(newCurve, fireError);
                                }
                                else {
                                    fireError(true);
                                    redrawAll();
                                }
                                newCurve = {};
                            }
                        }
                        else {
                            drawing = false;
                            newCurve = {};
                        }
                    });

                    $(canvas).on('mousemove', function(event) {
                        var point = extractPoint(event);
                        if ($scope.currentTool === $scope.TOOL_DRAW()) {
                            if (drawing) {
                                if (drawing === 'p0') {
                                    newCurve.p1 = point;
                                }
                                else if (drawing === 'p3') {
                                    newCurve.p2 = point;
                                    newCurve.p3 = point;
                                }
                                else {
                                    newCurve.p2 = flipPoint(point, newCurve.p3);
                                }
                                redrawAll();
                            }
                        }
                        else {
                            drawing = false;
                            newCurve = {};
                        }
                    });

                }
            };
        }]
    );
})();