angular.module('beerMeApp')
  .factory('searchResultsService',function($http){
  	var searchResultsService = {
  		getResults: function(beername,callback){
			var data = JSON.stringify({beername: beername})
  			console.log('what im sending to server',data)
			$http({
		      method: 'POST',
		      url: '/searchBeer',
		      data: data
		    }).success(function(data,status){
		    	// searchResultsService.beerResults = data;
		    	// console.log(searchResultsService.beerResults);
		    	console.log('the data has been received',data)
		    	callback(data)
		    }).error(function(error,status){
		    	console.log('error: ',error)
		    })
		}
  	}
  	return searchResultsService;
  })