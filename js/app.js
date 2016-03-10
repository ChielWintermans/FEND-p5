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
	self.infoWindows=[];
};
var model =new Model();

function ViewModel(){
	var self = this;
	var markerBouncing = null;
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
	    	var localResult=results[i];
	    	//console.log(localResult);
	    	if(localResult.location.coordinate){
	    	   	var Latlng = new google.maps.LatLng(localResult.location.coordinate.latitude,localResult.location.coordinate.longitude);
	        	var marker = new google.maps.Marker({
	        		position: Latlng,
	            	title:localResult.name,
	            	map:map,
	            	id: i
	            });
	        	marker.setMap(map);	 
	    		var thisItem={
	       			name: localResult.name,
	       			thisLl: new google.maps.LatLng(localResult.location.coordinate.latitude,localResult.location.coordinate.longitude),
	       			marker: marker
	    		};
	    		model.markers.push(thisItem);
	    	    var infowindow = new google.maps.InfoWindow({
    			//	content: localResult.name
  				});
	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function() {
		    			if (openInfoWindow) openInfoWindow.close();
		    			openInfoWindow = infoWindow;
		    			infowindow.setContent(results[i].name);
        				infowindow.open(map, marker);
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
	  	};
	  	function fetchDinerDetailsFromYelp(name, address, callback){
	    	console.log("using yelp");
	    	var requestData={
	      		url: 'https://api.yelp.com/v2/search',
	      		method: 'GET',
	      		data: {
	        		callback: "cb",
	        		//category_filter: "restaurants,cafes,bars,diners",
	        		term: name,
	        		location: address,
	        		radius_filter: 300,
	        		limit: 1
	      		}
	    	};
	    	sendSearchRequest(requestData, callback);
	  	}return{
	    	fetchDinersFromYelp: fetchDinersFromYelp,
	    	fetchDinerDetailsFromYelp: fetchDinerDetailsFromYelp
	  	};
	})();

	yelpConnector.fetchDinersFromYelp();
	self.markIt=function(){
		var thisLatLng=new google.maps.LatLng(51.445224, 5.460549);
		var thisMarker=new google.maps.Marker({
	        position: thisLatLng,
	        title: 'location x'});
	    thisMarker.setMap(map);
	};
	self.selectThis=function(venue){
		console.log(venue);
  		map.panTo(venue.thisLl);
  		thisMarker=venue.marker;
  		infoWindow.open(map, thisMarker);
  		//this.marker.setAnimation(google.maps.Animation.BOUNCE);
  		//setTimeout(this.cancelAnimation, 3000);
	};
	self.selectMarkerFromList=function(venue){
		selectedVenue=venue.name;
		console.log('selected: '+selectedVenue);
		for (i = 0; i < model.markers().length; i++) {
			console.log('checking '+model.markers()[i].name);
			if (selectedVenue === model.markers()[i].name) {
				console.log('found it');
				toggleInfoWindow(i);
				//infoWindow.open(map, venue.marker);
				break;
			};
		};
	}.bind(this);

	//Function to the toggle the infowindow of a specific marker
	function toggleInfoWindow(id) {
		console.log('id: '+id);
		var thisMarker=model.markers()[id];
		console.log(thisMarker);
		google.maps.event.trigger(thisMarker, 'click', (function(thisMarker, id){
			return function(){
				if (openInfoWindow) openInfoWindow.close();
		    	openInfoWindow = infoWindow;
		    	infowindow.setContent(results[id].name);
        		infowindow.open(map, thisMarker);
			};
		})(thisMarker, id));
	};
};
ko.applyBindings(new ViewModel());

/*	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function() {
		    			if (openInfoWindow) openInfoWindow.close();
		    			openInfoWindow = infoWindow;
		    			infowindow.setContent(results[i].name);
        				infowindow.open(map, marker);
        			};
    			})(marker, i));
*/