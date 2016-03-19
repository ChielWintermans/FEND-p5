// global variables
var map;
var infoWindow;
var results=[];
var venue=function(data){
	//this.isVis=ko.observable(true);
	this.name=ko.observable(data.name);
	this.phone=ko.observable(data.phone);
	this.address=ko.observable(data.location.display_address[0]);
	this.rating=ko.observable(data.rating);
	this.img=ko.observable(data.image_url);
	this.reviewCount=ko.observable(data.review_count);
	this.snippet=ko.observable(data.snippet_text);
	this.url=ko.observable(data.url);
};

function Model(){
	var self=this;
	//Set the home location coordinates to initialize the map here
	self.home=[51.44638,5.45719];
	//Create an empty array to store a list of map markers
	self.markers=ko.observableArray([]);
	self.venueList=ko.observableArray([]);
};
var model =new Model();

function ViewModel(){
	var self = this;
	self.windowOpen=ko.observable(false);
	// show map
	initMap=function(){
	   	var homeLl=new google.maps.LatLng(model.home[0],model.home[1]);
		var mapOptions={
	   		zoom: 16,
	   		center: homeLl,
	   		mapTypeId: google.maps.MapTypeId.ROADMAP
		};
		map=new google.maps.Map(document.getElementById('mapDiv'),mapOptions);
		// set visibility for google's default POI's to 'off'
		map.set('styles', [
  			{
  				featureType: 'poi',
  				elementType: 'all',
  				stylers: [
    				{ visibility: 'off' }
  				]
  			}
		]);
	};
	initMap();
	// build list of venues & set markers
	fillList=function(){
		results.forEach(function(venueItem){
			model.venueList.push(new venue(venueItem));
		});
	    for(i=0;i<results.length;i++){
	    	//console.log(results[i]);
	    	if(results[i].location.coordinate){
	        	var marker = new google.maps.Marker({
	        		position: new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude),
	            	title:results[i].name,
	            	map:map,
	            	id: i,
	            	icon: 'img/restaurants.png',
	            	animation: google.maps.Animation.DROP
	            });
	        	marker.setMap(map);	 
	    		model.markers.push(marker);
	    	    infowindow = new google.maps.InfoWindow({
  				});
	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function() {
		    			//map.panTo(new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude));
		    			thisName=marker.title;
 						for(i=0;i<model.venueList().length;i++){
 							thatName=model.venueList()[i].name();
 							if(thisName===thatName){
 								self.currentVenue(model.venueList()[i]);
 								break;
 							};
 						};
		    			windowOpen=true;
		    			infowindow.setContent(document.getElementById('info-cntt-holder'));
        				infowindow.open(map, marker);
        				// animate the marker on click
        				marker.setAnimation(google.maps.Animation.BOUNCE);
  						setTimeout(function(){ marker.setAnimation(null); }, 1400);   				
        			};
    			})(marker, i));
				// add listener for infowindow close click so ko bindings stay preserved.
				google.maps.event.addListener(infowindow, 'closeclick', closeInfoWindow);
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
 	selectFromList=function(venue){
  		google.maps.event.trigger(venue, 'click', {
			latLng: venue
		});
	};

	// function to preserve ko bindings to infowindow DOM element
	function closeInfoWindow() {
		self.windowOpen=false;
    	document.getElementById('cntt-container').appendChild(infowindow.getContent());
	};
	self.currentVenue=ko.observable(model.venueList()[0]);
};
ko.applyBindings(new ViewModel());