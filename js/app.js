// global variables
var map;
var infoWindow;
var results=[];
var FsResults=[];
var venue=function(data){
	this.Id=data.Id;
	this.name=ko.observable(data.name);
	this.phone=ko.observable(data.phone);
	this.address=ko.observable(data.location.display_address[0]);
	this.img=ko.observable(data.image_url);

	this.yelpRating=ko.observable(data.rating);
	this.yelpReviewCount=ko.observable(data.review_count);
	this.yelpSnippet=ko.observable(data.snippet_text);
	this.yelpUrl=ko.observable(data.url);

	this.category=ko.observable(data.category);
};

function Model(){
	var self=this;
	//Set the home location coordinates to initialize the map here
	self.home=[51.447581,5.457728];
	//Create an empty array to store a list of map markers
	self.markers=ko.observableArray([]);
	self.venueList=ko.observableArray([]);
};
var model =new Model();

function ViewModel(){
	var self = this;
	self.windowOpen=ko.observable(false);
	self.currentVenue=ko.observable(model.venueList()[0]);

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

	// build list of Yelp venues & set markers
	fillList=function(){
	    for(i=0;i<results.length;i++){
	    	//console.log(results[i]);
	    	if(results[i].location.coordinate && results[i].location.geo_accuracy>7 && results[i].phone){
	    		// set the marker icon according to category
	    		var thisIcon;
	    		var thisCategory=String(results[i].categories[0][0]);
	    		if((thisCategory.search(/activ/i)>-1)||(thisCategory.search(/gym/i)>-1)){
	    			thisIcon='img/play-schools.png';
	    		}else{
	    			thisIcon='img/restaurants.png';
	    		};
	    		// set the marker
	    		var venueData={
					name: results[i].name,
					phone: results[i].phone,
					location: results[i].location,
					image_url: results[i].image_url,
					rating: results[i].rating,
					review_count: results[i].review_count,
					snippet_text: results[i].snippet_text,
					url: results[i].url,
					category: results[i].categories
	    		};
	    		model.venueList.push(new venue(venueData));
	        	var marker = new google.maps.Marker({
	        		position: new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude),
	            	title:results[i].name,
	            	map:map,
	            	icon: thisIcon,
	            	animation: google.maps.Animation.DROP
	            });
	        	marker.setMap(map);	 
	    		model.markers.push(marker);
	    	    infowindow = new google.maps.InfoWindow({
  				});
	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function(){
         				checkIndex(marker);
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
	    fillListMore();
	};
	// build list of Foursquare venues & set markers 
	fillListMore=function(){
		var lastI=model.venueList().length;
		var thisIcon='img/museums.png';
		for(i=lastI;(i-lastI)<FsResults.length;i++){
			newI=i-lastI;
			//console.log(FsResults[i]);
			var FsName=FsResults[newI].venue.name;
			// check if a venue is already listed in markers array
         	function checkMarkers(FsName){
         		var foundMarker=model.markers().some(function(venueMarker){
         			return venueMarker.title===FsName;
         		});
         		if(!foundMarker){
         			if(FsResults[newI].venue.contact.phone){
	         			var venueData={
							name: FsResults[newI].venue.name,
							phone: FsResults[newI].venue.contact.phone,
							location: {display_address: [FsResults[newI].venue.location.address]},
							category: FsResults[newI].venue.categories[0].shortName,
							image_url: FsResults[newI].venue.photos.groups[0].items[0].prefix+'100x100'+FsResults[newI].venue.photos.groups[0].items[0].suffix,
						};
						//console.log(venueData.name+': '+venueData.category);
						model.venueList.push(new venue(venueData));
	         			var marker = new google.maps.Marker({
							position: new google.maps.LatLng(FsResults[newI].venue.location.lat,FsResults[newI].venue.location.lng),
				   			title:FsName,
				   			map:map,
				   			icon: thisIcon,
				   			animation: google.maps.Animation.DROP
						});
						marker.setMap(map);
						model.markers.push(marker);
						infowindow = new google.maps.InfoWindow({
	  					});
	  					google.maps.event.addListener(marker, 'click', (function(marker, i){
		    				return function(){
		    					checkIndex(marker);
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
		   	checkMarkers(FsName);
		};
	};

	// get foursquare data

	var FsConnector=(function(){

		// Foursquare tokens
		var CLIENT_ID="23ZBVKL12XL44XDMPUJZFHNY2ZHSQTNGCMOAFJ0HTHC1EG3S";
    	var CLIENT_SECRET="E3PEPIVQ4TAE00V5CGRGB3PEO2CS5TMH4YM14EKJN4L5BALN";
//	   	var CAT_ID="4d4b7105d754a06374d81259"; // food category
//		var CAT_ID2="4bf58dd8d48988d1d0941735"; // dessert shop

	    var searchFsRequest=function(requestPayload, callback){
		  	$.ajax({
		  		url: requestPayload.url,
		   		type: requestPayload.method,
		   	}).done(function(data){
		   		//console.log(data);
		   		FsResults = FsResults.concat(data.response.groups[0].items);
		   	}).fail(function(jqxhr, textStatus, error) {
		      	// Let empty results set indicate problem with load.
		      	// If there is no callback - there are no UI dependencies
		   		console.log("Failed to load: " + textStatus + ", " + error);
		   	}).always(function() {
		   		typeof callback === 'function' && callback(FsResults);
		   	});
	    };

	    // get venue data around specified point from Foursquare
 	    function fetchDataFromFs(){
		    var requestData = {
		    	url: 'https://api.foursquare.com/v2/venues/explore?client_id='+CLIENT_ID+'&client_secret='+CLIENT_SECRET+'&v=20130815&ll=51.447581,5.457728&radius=500&venuePhotos=1',
		    	method: 'GET',
		   	};
		    searchFsRequest(requestData);
		}return{
		   	fetchDataFromFs: fetchDataFromFs,
	  	};
  	})();
  	FsConnector.fetchDataFromFs();

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
	  
	   // get venue data around specified point from Yelp
	  	function fetchDataFromYelp(){
	    	var requestData = {
	      		url: 'https://api.yelp.com/v2/search',
	      		method: 'GET',
	      		data: {
	        		callback: "cb",
	        		category_filter: "restaurants,cafes,bars,diners,food,active",
	        		radius_filter: 550,
	        		ll: "51.447581, 5.457728"
	      		}
	   		};
	    	sendSearchRequest(requestData);
	  	}return{
	    	fetchDataFromYelp: fetchDataFromYelp,
	  	};
	})();
	yelpConnector.fetchDataFromYelp();
	
	// function to match venueList data with marker data
	function checkIndex(data){
		var foundId=model.venueList().findIndex(function(details){
			return details.name()===data.title;
		});
		if(foundId>-1){
	    	self.currentVenue(model.venueList()[foundId]);
	    };
	};

	// trigger a marker click event on list click
 	selectFromList=function(venue){
  		google.maps.event.trigger(venue, 'click', {
			latLng: venue
		});
	};

	// function to preserve ko bindings to infowindow DOM element
	function closeInfoWindow(){
		self.windowOpen=false;
    	document.getElementById('cntt-container').appendChild(infowindow.getContent());
	};

	// to do: 
	// insert this function in the fs listbuilding function
	// switch results[] for model.venueList() so only already marked venues are checked

	// function to match yelp venues to foursquare venues based on name even if they don't match 100%
	similars=function(){
		for(var item in results){
			var yelpName=String(results[item].name);
			for(var item in FsResults){
				var FsName=String(FsResults[item].venue.name);
				// helper function to prevent detection of false doubles
				function ignoreString(data){
					var ignoreThis=FsName.includes(data);
					if(ignoreThis){
						FsName=FsName.replace(data, '');
					};
				};
				ignoreString('Restaurant');
				ignoreString('Het Veem');
				for(i=0;i<(FsName.length-4);i++){
					var shortFsName=FsName.slice(i, i+5);
					var strFound=yelpName.includes(shortFsName);
					if(strFound){
						// only add additional data from foursquare to the venue object instead of adding a new venue object to the venueList.
						console.log('matched: '+FsName+', '+yelpName);
					}else{
						// add a new marker to marker array and a new venue object to the venuelist
					};
				};
			};
		};
	};
};
ko.applyBindings(new ViewModel());