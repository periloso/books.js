var myApp = angular.module('booksApp',['ngRoute','ui.bootstrap','infinite-scroll'])

.factory('socket', ['$rootScope', function ($rootScope) {
    var socket = io.connect('http://'+window.server+':3000');

    return {
        on: function (eventName, callback) {
            function wrapper() {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            }
 
            socket.on(eventName, wrapper);
 
            return function () {
                socket.removeListener(eventName, wrapper);
            };
        },
 
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if(callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
}])

// configure our routes
.config(function($routeProvider) {
  
  $routeProvider
    // route for the home page
    .when('/', {
      templateUrl : 'templates/index.html',
      controller  : 'homeController'
    })
    
    .when('/book/:id', {
      templateUrl : 'templates/single.html',
      controller  : 'singleController'
    });
    
})

.controller('mainController', function($scope,$rootScope,$http,socket, $location) {
  $scope.active = '';
  $scope.side = '';
  $scope.order = 'autor';
  $rootScope.isBooks = false;
  $rootScope.isHome = true;
  $rootScope.isSearch = false;
  $rootScope.orderID = 0;
  
  $rootScope.$on('$routeChangeSuccess', function () {
    if($location.path() === '/') { $rootScope.isHome = true; }
    else { $rootScope.isHome = false; }    
  });
  
  $scope.scan = function(){
    $scope.active = 'active';
    $http.post('/scan').success(function(data){
        $rootScope.books = data;
        $scope.active = '';
        if(!data.length) $rootScope.isBooks = true;
        else $rootScope.isBooks = false;
    });
  };
  
  $scope.showSearch = function(){
    $rootScope.isSearch = !$rootScope.isSearch;
  };
  
  $scope.showSide = function(){
    if($scope.side === '') $scope.side = 'open';
    else $scope.side = '';
  };
  
  $scope.reOrder = function(id){
      if(id === 'autor') $rootScope.orderID = 0;
      if(id === 'title') $rootScope.orderID = 1;
      $scope.order = id;
      $http.get('/api/books/page/0/'+$rootScope.orderID).success(function(data){
        $rootScope.books = data;
        $rootScope.$broadcast('repage');
      });
  };
  
  $scope.search = function(){
    $http.post('/search',{ search: $scope.searchValue }).success(function(data){
        $rootScope.books = data;
        $location.path('/');
    });
  };

  socket.on('scan', function(data){
        $scope.alert = data;
    });
    
  socket.on('stops', function(){
        $scope.alert = '';
    });

})

.controller('homeController', function($scope,$rootScope,$http,socket) {
  var loading = false;
  var page = 0;
  $scope.find = function(){
    page = 0;
    loading = true;
    if(!$rootScope.isSearch) {
      $http.get('/api/books/page/'+page+'/'+$rootScope.orderID).success(function(data){
        $rootScope.books = data;
        if(!data.length) $rootScope.isBooks = true;
        else $rootScope.isBooks = false;
        page++;
        loading = false;
      });
    }
  };
  
  $scope.loadMore = function(){ 
    if(!loading) {
      loading = true;
      $http.get('/api/books/page/'+page+'/'+$rootScope.orderID).success(function(data){
          for (var i = 0; i < data.length; i++) {
            $rootScope.books.push(data[i]);
          }
          page++;
          loading = false;
        });
      }
  };
  
  socket.on('stops', function(){
        page = 1;
    });
  
  $scope.$on('repage', function(event, args) {
      page = 1;
  });
})

.controller('singleController', function($scope,$rootScope,$http,$routeParams) {
  $scope.find = function(){
    $http.get('/books/'+$routeParams.id).success(function(data){
      if(data.metadata.date){
        var year = data.metadata.date.split('-');
        data.metadata.date = year[0];
      }
      data.metadata.calibreseries_index = parseInt(data.metadata.calibreseries_index);
      data.wordCount = parseInt(data.wordCount/1000);
      $scope.book = data;
    });
  };
  
  $scope.markRead = function(value) {
    if(typeof value === 'undefined' || !value) {
      $http.post('/api/readed/'+$routeParams.id).success(function(){
        $scope.book.read = true;
      });
    } else {
      $http.delete('/api/readed/'+$routeParams.id).success(function(){
        $scope.book.read = false;
      });
    }
  };
  
  $scope.markLike = function(value) {
    if(typeof value === 'undefined' || !value) {
      $http.post('/api/liked/'+$routeParams.id).success(function(){
        $scope.book.like = true;
      });
    } else {
      $http.delete('/api/liked/'+$routeParams.id).success(function(){
        $scope.book.like = false;
      });
    }
  };
  
});
