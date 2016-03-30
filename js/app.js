// global variables
var map;
var infowindow;
var results=[];
var FsResults=[];
var foodList=['Modern European', 'Desserts', 'German', 'French', 'Cafes', 'Do-It-Yourself Food', 'Coffee & Tea', 'Fondue', 'Caribbean', 'Ice Cream', 'Deli / Bodega', 'Hotel Bar', 'Coffee Shop', 'Restaurant', 'Café', 'Brewery', 'Bagels', 'Sandwiches', 'Fish & Chips', 'Food Stands', 'Dive Bars', 'Food'];
var activeList=['Active Life', 'Gyms', 'Skate Park', 'Climbing Gym', 'Gym / Fitness', 'Dance Studio'];
var museumList=['Art Museum', 'Science Museum', 'Art Gallery'];

// function to create venue objects
var venue=function(data){
	this.dataSrc=ko.observable(data.src);
	this.name=ko.observable(data.name);
	this.phone=ko.observable(data.phone);
	this.address=ko.observable(data.location.display_address[0]);
	this.img=ko.observable(data.image_url);
	this.category=ko.observable(data.category);
	this.webUrl=ko.observable(data.webUrl);

	this.yelpRating=ko.observable(data.yRating);
	this.yelpReviewCount=ko.observable(data.yReview_count);
	this.yelpRatingImg=ko.observable(data.yRatingImg);
	this.yelpSnippet=ko.observable(data.ySnippet_text);
	this.yelpUrl=ko.observable(data.yUrl);

	this.fsRating=ko.observable(data.fsRating);
	this.fsLink=ko.observable(data.fsLink);
	this.fsTips=ko.observable(data.fsTips);
	this.fsTipSnippet=ko.observable(data.fsTipSnippet);
	this.fsTipLink=ko.observable(data.fsTipLink);
};

function Model(){
	var self=this;
	//Set the home location coordinates to initialize the map here
	self.home=[51.447581,5.457728];
	//Create an observable array to store a list of map markers
	self.markers=ko.observableArray([]);
	//Create an observable array to store a list of venue objects
	self.venueList=ko.observableArray([]);
};
var model =new Model();

function ViewModel(){
	var self = this;
	// variable to store the selected venue
	self.currentVenue=ko.observable(model.venueList()[0]);
	self.searchTerm=ko.observable();
	self.errorMessage=ko.observable();

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
	}();
	
	// build list of Yelp venues & set markers
	fillList=function(){
	    for(i=0;i<results.length;i++){
	    	if(results[i].location.coordinate && results[i].location.geo_accuracy>7/* && results[i].phone*/){
	    		var venueData={
	    			src: 'yelp',
					name: results[i].name,
					phone: results[i].phone,
					location: results[i].location,
					image_url: results[i].image_url,
					ySnippet_text: results[i].snippet_text,
					yUrl: results[i].url
	    		};
	    		if(!results[i].image_url){
	    			venueData.image_url='img/default.jpg';
	    		};
	    		if(results[i].review_count>0){
	    			venueData.yRating=results[i].rating;
	    			venueData.yRatingImg=results[i].rating_img_url;
	    			venueData.yReview_count=results[i].review_count;

	    		};
	    		// set the category & corresponding marker img
	    		setCategory(String(results[i].categories[0][0]), venueData);
	    		var thisIcon=venueData.icon;
	    		model.venueList.push(new venue(venueData));
	        	var marker = new google.maps.Marker({
	        		position: new google.maps.LatLng(results[i].location.coordinate.latitude,results[i].location.coordinate.longitude),
	            	title:results[i].name,
	            	map:map,
	            	icon: thisIcon,
	            	animation: google.maps.Animation.DROP,
	            	isVisible: ko.observable(true)
	            });
	        	marker.setMap(map);	 
	    		model.markers.push(marker);
	    	    infowindow = new google.maps.InfoWindow({
  				});
	  			google.maps.event.addListener(marker, 'click', (function(marker, i) {
	    			return function(){
	    				resetErrMsg();
         				checkIndex(marker);
		    			infowindow.setContent(document.getElementById('info-cntt-holder'));
        				infowindow.open(map, marker);
        				// animate the marker on click
        				marker.setAnimation(google.maps.Animation.BOUNCE);
        				setTimeout(function(){ marker.setAnimation(null); }, 1400);   
        				// add listener to close the infowindow if the corresponding marker is hidden
        				google.maps.event.addListenerOnce( marker, "visible_changed", function(){
        					console.log('closing infowindow 1');
        					infowindow.close();
        					//google.maps.event.trigger(infowindow, 'closeclick', closeInfoWindow);
        					//closeInfoWindow();
    					});
        			};
    			})(marker, i));
				// add listener for infowindow close click so ko bindings stay preserved.
				google.maps.event.addListener(infowindow, 'closeclick', closeInfoWindow);
	    	};
	    };
		similars();
	};

	// build list of Foursquare venues & set markers 
	fillListMore=function(){
		var lastI=model.venueList().length;
		for(i=lastI;(i-lastI)<FsResults.length;i++){
			newI=i-lastI;
			var FsName=FsResults[newI].venue.name;
   			//if(FsResults[newI].venue.contact.phone){
       			var venueData={
      				src: 'fs',
					name: FsResults[newI].venue.name,
					phone: FsResults[newI].venue.contact.phone,
					location: {display_address: [FsResults[newI].venue.location.address]},
					image_url: FsResults[newI].venue.photos.groups[0].items[0].prefix+'100x100'+FsResults[newI].venue.photos.groups[0].items[0].suffix				
				};
				appendFsData(venueData, newI);
				setCategory(FsResults[newI].venue.categories[0].shortName, venueData);
				model.venueList.push(new venue(venueData));
				var thisIcon=venueData.icon;
       			var marker = new google.maps.Marker({
					position: new google.maps.LatLng(FsResults[newI].venue.location.lat,FsResults[newI].venue.location.lng),
		   			title:FsName,
		   			map:map,
		   			icon: thisIcon,
		   			animation: google.maps.Animation.DROP,
	            	isVisible: ko.observable(true)
				});
				marker.setMap(map);
				model.markers.push(marker);
				infowindow = new google.maps.InfoWindow({
				});
				google.maps.event.addListener(marker, 'click', (function(marker, i){
    				return function(){
    					resetErrMsg();
    					checkIndex(marker);
	   					infowindow.setContent(document.getElementById('info-cntt-holder'));
       					infowindow.open(map, marker);
       					// animate the marker on click
       					marker.setAnimation(google.maps.Animation.BOUNCE);
						setTimeout(function(){ marker.setAnimation(null); }, 1400);
						// add listener to close the infowindow if the corresponding marker is hidden
						google.maps.event.addListenerOnce( marker, "visible_changed", function(){
							console.log('closing infowindow 2');
        					infowindow.close();
    					});				
       				};
   				})(marker, i));
   				// add listener for infowindow close click so ko bindings stay preserved.
				google.maps.event.addListener(infowindow, 'closeclick', closeInfoWindow);
	        //};
		};
	};

	// get foursquare data
	var FsConnector=(function(){

		// Foursquare tokens
		var CLIENT_ID="23ZBVKL12XL44XDMPUJZFHNY2ZHSQTNGCMOAFJ0HTHC1EG3S";
    	var CLIENT_SECRET="E3PEPIVQ4TAE00V5CGRGB3PEO2CS5TMH4YM14EKJN4L5BALN";

	    var searchFsRequest=function(requestPayload, callback){
		  	$.ajax({
		  		url: requestPayload.url,
		   		type: requestPayload.method,
		   	}).done(function(data){
		   		//console.log(data);
		   		FsResults=FsResults.concat(data.response.groups[0].items);
		   		//FsLoaded=true;
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
	
	// set venue category & marker img
	function setCategory(data, target){
		var foundFood=foodList.some(function(details){
			return details===data;
		});
		var foundActive=activeList.some(function(details){
			return details===data;
		});
		var foundMuseum=museumList.some(function(details){
			return details===data;
		});
		if(foundFood){
			target.icon='img/restaurants.png';
			target.category='Food & drink';
		}else if(foundActive){
			target.icon='img/play-schools.png';
			target.category='Active Life';
		}else if(foundMuseum){
			target.icon='img/museums.png';
			target.category='Museums';
		}else{
			target.icon='img/default.png';
			target.category=data;
		};
	};

	// match venueList data with marker data
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

	// preserve ko bindings to infowindow DOM element
	function closeInfoWindow(){
//		if(infowindow){
    		document.getElementById('cntt-container').appendChild(infowindow.getContent());
    	//};
	};

	// match yelp venues to foursquare venues based on name even if they don't match 100%
	similars=function(){
		for(var item in model.venueList()){
			var thisVenue=model.venueList()[item];
			if(thisVenue.dataSrc()==='yelp'){
				var venueName=String(thisVenue.name());
				for(var item2 in FsResults){
					var FsName=String(FsResults[item2].venue.name);
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
						var strFound=venueName.includes(shortFsName);
						if(strFound){
							// only add additional data from foursquare to the venue object
							appendFsData(thisVenue, item2);
							FsResults.splice(item2,1);
							thisVenue.checked=true;
							break;
						};
					};
				};
			};	
		};
		fillListMore();
	};

	function appendFsData(venueObject, fsId){
		if(!venueObject.img){
			venueObject.img=FsResults[fsId].venue.photos.groups[0].items[0].prefix+'100x100'+FsResults[fsId].venue.photos.groups[0].items[0].suffix;
		};
		venueObject.webUrl=FsResults[fsId].venue.url;
		venueObject.fsRating=FsResults[fsId].venue.rating;
		venueObject.fsLink='http://foursquare.com/v/'+FsResults[fsId].venue.id;
		if(FsResults[fsId].tips){
			venueObject.fsTips=FsResults[fsId].tips.length;
			venueObject.fsTipSnippet=FsResults[fsId].tips[0].text;
			venueObject.fsTipLink=FsResults[fsId].tips[0].canonicalUrl;
		};
	};

	// filter results by category show this category
	showThis=function(data){
		resetErrMsg();
		if(infowindow){
			closeInfoWindow();
		};
		resetMarkers();
		for(var venueDetails in model.venueList()){
			var venueCat=model.venueList()[venueDetails].category();
			if(data==='Other'){
				if((venueCat==='Food & drink')||(venueCat==='Active Life')||(venueCat==='Museums')){
					var thisPlace=model.venueList()[venueDetails].name();
					var thisPlaceMarker=model.markers().findIndex(function(details){
						return details.title===thisPlace;
					});
					if(thisPlaceMarker>-1){
						model.markers()[thisPlaceMarker].setVisible(false);
						model.markers()[thisPlaceMarker].isVisible(false);
					}else{
						model.markers()[thisPlace].setVisible(true);
						model.markers()[thisPlace].isVisible(true);
					};
				};
			}else{
				if(venueCat!=data){
					var thisPlace=model.venueList()[venueDetails].name();
					var thisPlaceMarker=model.markers().findIndex(function(details){
						return details.title===thisPlace;
					});
					if(thisPlaceMarker>-1){
						model.markers()[thisPlaceMarker].setVisible(false);
						model.markers()[thisPlaceMarker].isVisible(false);
					}else{
						model.markers()[thisPlaceMarker].setVisible(true);
						model.markers()[thisPlaceMarker].isVisible(true);
					};
				};
			};
		};
	};

	// set all markers to visible
	resetMarkers=function(){
		for(var vis in model.markers()){
			model.markers()[vis].setVisible(true);
			model.markers()[vis].isVisible(true);
		};
	};

	// search for..
	searchVenues=function(){
		var findThis=String(self.searchTerm()).toLowerCase();
		if(findThis===''){
			resetMarkers();
		}else{
			var resultFound=false;
			for(var thisVenue in model.markers()){
				var checkName=String(model.markers()[thisVenue].title).toLowerCase();
				var matchFound=checkName.includes(findThis);
				if(!matchFound){
					model.markers()[thisVenue].setVisible(false);
					model.markers()[thisVenue].isVisible(false);
				}else{
					console.log('matched: '+checkName);
					model.markers()[thisVenue].setVisible(true);
					model.markers()[thisVenue].isVisible(true);
					resultFound=true;		
				};
			};
			if(!resultFound){
				self.errorMessage('no matches found');
				resetMarkers();
			};
		};
	};

	// clear the error msg & search fields
	function resetErrMsg(){
		self.errorMessage('');
		self.searchTerm('');
	};
};
ko.applyBindings(new ViewModel());