// global variables
var map;
var infoWindow;
var results=[];

function Model(){
	var self=this;
	//Set the home location coordinates to initialize the map here
	self.home=[51.44638,5.45719];
	//Create an empty array to store a list of map markers
	self.markers=ko.observableArray([]);
};
var model =new Model();

function ViewModel(){
	var self = this;
	var openInfoWindow = null;
	// show map
	initMap=function(){
	   	var homeLl=new google.maps.LatLng(model.home[0],model.home[1]);
		var mapOptions={
	   		zoom: 16,
	   		center: homeLl,
	   		mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		map=new google.maps.Map(document.getElementById('mapDiv'),mapOptions);
	};
	initMap();
	// build list of venues & set markers
	fillList=function(){
	    for(i=0;i<results.length;i++){
	    	//console.log(results[i]);
	    	if(results[i].location.coordinate){
	        	var marker = new google.maps.Marker({
	        		position: new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude),
	            	title:results[i].name,
	            	map:map,
	            	id: i,
	            	animation: google.maps.Animation.DROP
	            });
	        	marker.setMap(map);	 
	    		model.markers.push(marker);
	    	    infowindow = new google.maps.InfoWindow({
  				});
	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function() {
		    			if (openInfoWindow) openInfoWindow.close();
		    			map.panTo(new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude));
		    			openInfoWindow = infoWindow;
		    			infowindow.setContent(results[i].name);
        				infowindow.open(map, marker);
        				marker.setAnimation(google.maps.Animation.BOUNCE);
  						setTimeout(function(){ marker.setAnimation(null); }, 1400);        				
        			};
    			})(marker, i));
	    	};
	    };
	};
	// get yelp data
	var yelpConnector = (function() {
		var oauth = OAuth({
			consumer: {
	    		public: 'bkM2SMQ6iUbp2XoP3Xed7g',
	    		secret: 'J_dGfeDaTeIT4FbozDotXzfTm3k'
	    	},
	    	signature_method: 'HMAC-SHA1'
	  	});
		var token = {
	    	public: 'qdzlCxuMLI-dggE_-jPcd2XdimSO-mM3',
	    	secret: 'KDFMcs4Y33xqeQrwxeFJPS48ZKg'
	  	};
		var offset = 0;
		var setStep = 20;
	  	var sendSearchRequest = function(requestPayload, callback){
	    	$.ajax({
	    		url: requestPayload.url,
	    		type: requestPayload.method,
	    		dataType: "jsonp",
	    		cache: true,
	    		data: oauth.authorize(requestPayload, token),
	    	}).done(function(data){
	      		results = results.concat(data.businesses);
	      		if (data.total > (offset + setStep)) {
        			offset += setStep;
        			requestPayload.data.offset = offset;
        			sendSearchRequest(requestPayload, callback);
        			return;
      			};
	      		fillList();
	   		}).fail(function(jqxhr, textStatus, error) {
	      	// Let empty results set indicate problem with load.
	      	// If there is no callback - there are no UI dependencies
	      		console.log("Failed to load: " + textStatus + ", " + error);
	    	}).always(function() {
	      		typeof callback === 'function' && callback(results);
	    	});
	  	};
	  /**
	   * Function to get list of diners around specified point from Yelp
	   * @param  {Object} latlng LatLng object to center the search
	   */
	  	function fetchDinersFromYelp(){
	    	var requestData = {
	      		url: 'https://api.yelp.com/v2/search',
	      		method: 'GET',
	      		data: {
	        		callback: "cb",
	        		category_filter: "restaurants,cafes,bars,diners",
	        		radius_filter: 300,
	        		ll: "51.44638, 5.45719"
	      		}
	   		};
	    	sendSearchRequest(requestData);
	  	}return{
	    	fetchDinersFromYelp: fetchDinersFromYelp,
	  	};
	})();
	yelpConnector.fetchDinersFromYelp();
	// trigger a marker click event on list click
	self.selectFromList=function(venue){
		//console.log(venue);
  		google.maps.event.trigger(venue, 'click', {
			latLng: venue
		});
	};
};
ko.applyBindings(new ViewModel());