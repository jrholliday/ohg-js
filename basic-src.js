/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true */
/*global jQuery google ajax kmz*/

function init_basic_forecast(uid) {
    /* Variable Declaration */
    var mapOptions, map, forecast, geocoder, log, results, circle;

    results = jQuery('#basic-forecast-report').html();

    /* Initialize the jQuery popup dialogs */
    jQuery('#basic-forecast-warning').dialog({ autoOpen: false, modal: true });

    /* Initialize the input fields */
    jQuery('#address').val('Enter Location');

    /* Initialize the map object */
    mapOptions = {
	zoom: 7,
	center: new google.maps.LatLng(38,-120),
	mapTypeId: google.maps.MapTypeId.TERRAIN,
	disableDefaultUI: true,
	draggable: false,
	disableDoubleClickZoom: true
    };
    map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
    forecast = new google.maps.KmlLayer(kmz+'/wo-forecast.kmz', {suppressInfoWindows: true, preserveViewport: true});
    forecast.setMap(map);

    /* Initialize the geocoder */
    geocoder = new google.maps.Geocoder();


    log = 0; // First time doesn't get logged

    /* Check address field.  If the field is empty, change the text
     * color to gray and display "Enter Location" as a tip.  Reset the
     * color and clear the value if the user attempts to enter an
     * address.
     */
    jQuery('#address').focus( function() {
	if ( jQuery('#address').val() === 'Enter Location' )
	{
	    jQuery('#address').css({color:'black'});
	    jQuery('#address').val('');
	}
    });
    
    jQuery('#address').blur( function() {
	if ( jQuery('#address').val() === '' )
	{
	    jQuery('#address').css({color:'grey'});
	    jQuery('#address').val('Enter Location');
	}
    });
    
    function drawCircle(center, radius) {
	var i, lat, lng, d2r, circleLatLngs, circleLat, circleLng, theta, vertexLat, vertexLng, polyOptions;

	lat = center.lat();
	lng = center.lng();

	d2r = Math.PI / 180;
	circleLatLngs = [];
	circleLat = radius * 0.008999;  // Convert statute kms into degrees latitude
	circleLng = circleLat / Math.cos(lat * d2r);

	// 2PI = 360 degrees, +1 so that the end points meet
	for (i=0; i<=24; i+=1) {
	    theta = Math.PI * (i / 12); 
	    vertexLat = lat + circleLat * Math.sin(theta); 
	    vertexLng = lng + circleLng * Math.cos(theta);

	    circleLatLngs.push(new google.maps.LatLng(vertexLat, vertexLng));
	}

	polyOptions = {
	    paths: circleLatLngs,
	    clickable: false,
	    strokeColor: 'black',
	    strokeWeight: 3,
	    fillOpacity: 0,
	    map: map
	};
	return new google.maps.Polygon(polyOptions);
    }

    function formatValue(string) {
	var value = parseFloat(string);

	if ( value > 99.99 )
	{
	    value = "99.99%";
	}
	else if ( value < 0.05 )
	{
	    value = "Less than 0.05%";
	}
	else
	{
	    value = value.toFixed(2) + "%";
	}

	return value;
    }

    /* Form Submit.
     *
     * Parse the input fields, make a JSON call to query the database,
     * display the results in a new div.
     */
    jQuery('#basic-forecast').submit( function() {
	if ( circle !== undefined )
	{
	    circle.setMap(null);
	}

	jQuery('#loading').show();

        geocoder.geocode( {'address': jQuery('#address').val()}, function(results, status) {
            /* Variable Declaration */
            var loc;

            if (status !== google.maps.GeocoderStatus.OK) {
                jQuery('#loading').hide();
		jQuery('#forecast-warning').dialog('open');
            }
            else
            {
                loc = results[0].formatted_address;
                loc = loc.substr(0,loc.lastIndexOf(','));

                map.setCenter(results[0].geometry.location);
		map.setZoom(7);
		circle = drawCircle(results[0].geometry.location, 80.4672);

		jQuery.getJSON(ajax+"/quick?c=?", {q:jQuery('#address').val(),w:"30,365,1095",m:"5",r:80.4672, u:uid}, function(data) {
		    /* Variable Declaration */
		    var place, probs, text;

		    /* Read back the results */
		    place = data.loc;
		    probs = data.prob;

		    /* Check to see if a location was found? */
		    if ( place === "" )
		    {
			/* Not found.  Warn the user */
			jQuery('#results').html("");
			jQuery('#basic-forecast-warning').dialog('open');
		    }
		    else
		    {
			text  = '<div style="width:394px; margin:0 auto; border:1px solid #808080; background-color: LightYellow; font-size:120%; text-align:left; padding:5px 5px 0 5px;">';
			text += 'The chances of a damaging earthquake (magnitude 5 or greater) happening within <span style="font-weight:bold;">50 miles</span> of <span style="font-weight:bold;">' + place + '</span> are:';
			text += '<ul style="padding-left: 10px;">';
			text += '<li><span style="font-weight:bold;">' + formatValue(probs[["5.0","30"]]) + '</span> within <span style="font-weight:bold;">1 month</span></li>';
			text += '<li><span style="font-weight:bold;">' + formatValue(probs[["5.0","365"]]) + '</span> within <span style="font-weight:bold;">1 year</span></li>';
			text += '<li><span style="font-weight:bold;">' + formatValue(probs[["5.0","1095"]]) + '</span> within <span style="font-weight:bold;">3 years</span></li>';
			text += '</ul>';
			text += '</div>';

			jQuery('#results').html(text);
		    }

		    jQuery('#loading').hide();
		    log = 3; // Additional searches get logged
		});
	    }
	});

        return false;
    });

    jQuery.getJSON('http://api.ipinfodb.com/v3/ip-city/?callback=?', {
        key:'eb6b91ebc938cbd840d53daf396ee1d94f1ff497cd72ec6dbcad87d042ee2b78',
        format:'json'
    }, function(data) {
        if ( data.cityName !== '' )
        {
	    jQuery('#address').val(data.cityName + ', ' + data.regionName);
	    jQuery('#address').css({color:'black'});
	    jQuery('#basic-forecast').submit();
        }
        else
        {
	    log = 3; // Start logging searches
        }
    });
}

