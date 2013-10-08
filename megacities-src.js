/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true */
/*global jQuery google ajax kmz window */

function sigfig(value, num) {
    value = parseFloat(value);

    if ( value > 1.0 ) {
	return value.toFixed(num);
    }
    else {
	return value.toPrecision(num);
    }
}

function init_megacities(city) {
    /* Variable Declaration */
    var map, geocoder;

    map = new google.maps.Map2(document.getElementById("map_canvas"));
    geocoder = new google.maps.ClientGeocoder();

    map.setMapType(google.maps.PHYSICAL_MAP);
    map.setCenter(new google.maps.LatLng(38,-120),7);
    map.disableDragging();
    map.disableInfoWindow();
    map.addOverlay( new google.maps.GeoXml(kmz+'/forecast') );

    jQuery('#loading').show();
    geocoder.getLocations( city, function(response) {
        /* Variable Declaration */
        var loc, coords;

        if (!response || response.Status.code !== 200) {
            jQuery('#loading').hide();
            //alert("Status Code:" + response.Status.code);
	    window.location = "megacities";
        }
        else
        {
            loc = response.Placemark[0].address;
            loc = loc.substr(0,loc.lastIndexOf(','));

	    jQuery('#placename').html( loc );

            coords = response.Placemark[0].Point.coordinates;

            map.setCenter(new google.maps.LatLng(coords[1],coords[0]), 7);

	    jQuery.getJSON(ajax+"/quick?c=?", {q:coords.toString(),m:"5,6,7",w:"30,365,1825",r:80.4672,l:0,u:0}, function(data) {
		var probs, prob5, rate5;

		probs = data.prob;

                if ( loc === '' )
                {
                    jQuery('#results').hide();
                }
                else
                {
		    prob5 = parseFloat(probs["5.0,365"]);
		    rate5 = -Math.log(1.0-0.01*prob5);

                    if ( prob5 > 1.0 ) { prob5 = prob5.toFixed(2);     }
                    else               { prob5 = prob5.toPrecision(2); }

                    jQuery('#results').html( jQuery('#template').html()
                                        .replace(/_1/g,loc)
                                        .replace(/_2/g,prob5) );
                    jQuery('#results').show();

		    jQuery('#cityplot').attr("src", "http://www.openhazards.com/Tools/chart?rate="+(rate5/365)+"&mag=5.0");

		    jQuery('#citytable').dataTable( {
			"bPaginate": false,
			"bLengthChange": false,
			"bFilter": false,
			"bInfo": false,
			"bAutoWidth": false,
			"aoColumns": [ { "sTitle": "Magnitude (M&gt;mag)" }, { "sTitle": "Forecast (days)" }, { "sTitle": "Probability (%)" } ],
			"aaData": [
			    [ "5.0",   "30", sigfig(probs["5.0,30"],   2) ],
			    [ "5.0",  "365", sigfig(probs["5.0,365"],  2) ],
			    [ "5.0", "1825", sigfig(probs["5.0,1825"], 2) ],
			    [ "6.0",   "30", sigfig(probs["6.0,30"],   2) ],
			    [ "6.0",  "365", sigfig(probs["6.0,365"],  2) ],
			    [ "6.0", "1825", sigfig(probs["6.0,1825"], 2) ],
			    [ "7.0",   "30", sigfig(probs["7.0,30"],   2) ],
			    [ "7.0",  "365", sigfig(probs["7.0,365"],  2) ],
			    [ "7.0", "1825", sigfig(probs["7.0,1825"], 2) ]
			]
		    });
		}

                jQuery('#loading').hide();
	    });
        }
    });

    return false;
}
