'use strict';

angular.module('beerMeApp')
	.controller('similarBeers',function ($cookieStore, $filter, $scope, $stateParams, recommendationsRequest, similarBeerService){
    
    $scope.haveLocation = false; 

    //the various options here keep track of the similar beers so that the data isn't lost on page reload
    $scope.similarBeers = similarBeerService.getSimilarBeers();
    if ($scope.similarBeers && $scope.similarBeers.length > 0) {
      localStorage.setItem('similarBeers', JSON.stringify($scope.similarBeers));
    }
    $scope.sortofSimilarBeers = similarBeerService.getSortofSimilarBeers();
    if ($scope.sortofSimilarBeers && $scope.sortofSimilarBeers.length > 0) {
      localStorage.setItem('sortofSimilarBeers', JSON.stringify($scope.sortofSimilarBeers));
    }
    
    if ($scope.similarBeers && $scope.sortofSimilarBeers) {
      $scope.beerResults = $scope.similarBeers.concat($scope.sortofSimilarBeers);
    } else if ($scope.similarBeers && !$scope.sortofSimilarBeers){
      $scope.beerResults = $scope.similarBeerService
    } else if (!$scope.similarBeers && $scope.sortofSimilarBeers) {
      $scope.beerResults = $scope.sortofSimilarBeers
    } else {
      var simBeers = localStorage.getItem('similarBeers') || '[]';
      var parsedSimBeers = JSON.parse(simBeers);
      var sortaSimBeers = localStorage.getItem('sortofSimilarBeers') || '[]';
      var parsedSorta = JSON.parse(sortaSimBeers);
      $scope.beerResults = parsedSimBeers.concat(parsedSorta);
    }
    
    //removes duplicates from array. Since one beer can have more than one location, there are dups.  
    $scope.newBeerResults = [];
    var nameStore = {};
    for (var i = 0; i < $scope.beerResults.length; i++){
      if (!nameStore[$scope.beerResults[i].name]) {
        nameStore[$scope.beerResults[i].name] = true;
        $scope.newBeerResults.push($scope.beerResults[i]);
      }
    }

    //sorts results by distance from user if we know user's location
    if (localStorage.latitude && localStorage.longitude && localStorage.latitude !== 'undefined' && localStorage.longitude !== 'undefined') {
      $scope.haveLocation = true; 
      $scope.newBeerResults = $scope.newBeerResults.sort(function(a, b){
        return a.distance >= b.distance ? 1 : -1
      })
    }
    
    //these retrieve the original beer searched on and its icon image from the $cookieStore
    $scope.originalBeer = $cookieStore.get('beername');
    $scope.iconUrl = $cookieStore.get('image'); 
    

    //this controls pagination and filtering
    $scope.totalItems = $scope.beerResults.length; 
    $scope.itemsPerPage = 7;
    $scope.currentPage = 1;
    $scope.pageCount = function () {
      return Math.ceil($scope.totalItems / $scope.itemsPerPage);
    };

    $scope.$watch(function() {
      return [$scope.currentPage, $scope.itemsPerPage, $scope.filter].join('-');
    }, function() {
      var begin = ($scope.currentPage - 1) * $scope.itemsPerPage;
      var end = begin + $scope.itemsPerPage;
      var prefilteredBeers = $filter('filter')($scope.newBeerResults, $scope.filter);
      $scope.totalItems = prefilteredBeers.length;
      $scope.filteredbeerResults = prefilteredBeers.slice(begin, end);
    })

    //goes to one beer view
    $scope.clicked = recommendationsRequest.clicked;
	})





