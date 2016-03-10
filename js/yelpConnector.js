var results=[];

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
      //console.log(results);
      for(i=0;i<results.length;i++){
        var localResult=results[i];
        if(localResult.location.coordinate){
          var thisItem={
            name: localResult.name,
            thisLl: new google.maps.LatLng(localResult.location.coordinate.latitude,localResult.location.coordinate.longitude)
          };
          //console.log(thisItem);
          model.markers.push(thisItem);
        };
      };
      console.log('got yelp');
      model.gotYelp=true;
      //initMap();
      if(model.gotYelp){
      var homeLl=new google.maps.LatLng(model.home[0],model.home[1]);
      var mapOptions={
            zoom: 16,
            center: homeLl,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        map=new google.maps.Map(document.getElementById('mapDiv'),mapOptions);
        var venueListLength=model.markers().length;
//      console.log(venueListLength);
      for(i=0;i<venueListLength;i++){
        var Latlng = model.markers()[i].thisLl;
        var marker = new google.maps.Marker({
              position: Latlng,
                title:model.markers()[i].name});
            marker.setMap(map);
          };
      };
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
        //category_filter: "restaurants,cafes,bars,diners",
        radius_filter: 300,
        ll: "51.44638, 5.45719"
      }
    };
    sendSearchRequest(requestData);
  };
  function fetchDinerDetailsFromYelp(name, address, callback){
    console.log("using yelp");
    //results = [];
    //offset = 0;
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