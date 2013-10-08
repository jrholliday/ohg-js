/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:false, newcap:true, immed:true */
/*global jQuery window google alert kmz ajax tdir */

function init_response(uid) {
    /* Variable Declaration */
    var rad, distHaversine,
        mapOptions,
        map1,            /* Storage for google map object      */
        map2,            /* Storage for google map object      */
        geocoder,        /* Storage for google geocoder object */
        forecast,
        faults,
        mapMarkerH1,     /* Storage for map query marker       */
        mapMarkerS2,     /* Storage for map query marker       */
        mapMarkerH2,     /* Storage for map query marker       */
        image,
        shadow,
        init_home,
        init_evnt;

    rad = function(x) {return x*Math.PI/180;};

    distHaversine = function(p1, p2) {
	var R, dLat, dLong, a, c;

	R = 6371; // earth's mean radius in km
	dLat  = rad(p2.lat() - p1.lat());
	dLong = rad(p2.lng() - p1.lng());

	a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) * Math.sin(dLong/2) * Math.sin(dLong/2);
	c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

	return R*c;
    };


    jQuery('#frame option').get(0).selected = true;
    jQuery('#eqmag option').get(0).selected = true;
    jQuery("input[name='soil']").get(0).checked = true;

    jQuery('#lyear, #year').hover(
	function() {
	    jQuery('#help1').show();
	},
	function() {
	    jQuery('#help1').hide();
	}
    );


    jQuery('#lfloors, #floors').hover(
	function() {
	    jQuery('#help2').show();
	},
	function() {
	    jQuery('#help2').hide();
	}
    );

    jQuery('#lhsize, #hsize').hover(
	function() {
	    jQuery('#help3').show();
	},
	function() {
	    jQuery('#help3').hide();
	}
    );

    jQuery('#lval, #val').hover(
	function() {
	    jQuery('#help4').show();
	},
	function() {
	    jQuery('#help4').hide();
	}
    );

    jQuery('#lframe, #frame').hover(
	function() {
	    jQuery('#help5').show();
	},
	function() {
	    jQuery('#help5').hide();
	}
    );

    jQuery('#lsoil, #soil').hover(
	function() {
	    jQuery('#help6').show();
	},
	function() {
	    jQuery('#help6').hide();
	}
    );


    function zoomMaps() {
	google.maps.event.trigger(map1, "resize");
	google.maps.event.trigger(map2, "resize");

        var bounds = new google.maps.LatLngBounds();

        if ( jQuery('#searchstring').val() !== jQuery('#searchstring2').val() )
	{
	    jQuery('#search').submit();
	}
	else
	{
            bounds.extend(mapMarkerH2.getPosition());
            bounds.extend(mapMarkerS2.getPosition());
	    map2.fitBounds(bounds);
	}
    }

    function num_strip(nStr) { return nStr.replace(/[^\d\.]/g, ''); }
    function num_format(nStr) {
	var x, x1, x2, rgx;

	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
    }

    function validateFields()
    {
	var value, built, size, floors;

	value = num_strip( jQuery('#val').val() );
	if ( value === "" ) { value = 250000; }
	jQuery('#val').val( '$' + num_format(value) );

	built = parseInt(jQuery('#year').val(), 10);
	built = ( built > 0 ? built : 1980 );
	jQuery('#year').val(built);

	size = parseInt(num_strip(jQuery('#hsize').val()), 10);
	size = ( size > 0 ? size : 1000 );
	jQuery('#hsize').val( num_format(size) + ' sqft');

	floors = parseInt(jQuery('#floors').val(), 10);
	floors = ( floors > 0 ? floors : 1 );
	jQuery('#floors').val(floors);
    }

    function checkZillow() {
	jQuery('#loading').show();

	// Get the ZPID and basic home info
	var loc = jQuery('#searchstring2').val();
	jQuery.getJSON(ajax+"/zillow.php?c=?", {loc:loc}, function(data){
	    /* Variable Declaration */
	    var zpid, street, city, state, zip, lat, lng, value, yearBuilt, lotSizeSqFt, finishedSqFt;

            // ZPID
            zpid = data.zpid;

            // ADDRESS
            street = data.street;
            city   = data.city;
            state  = data.state;
            zip    = data.zip;
            lat    = parseFloat(data.lat);
            lng    = parseFloat(data.lng);

            // VALUE
            value = data.value;

            // INFO
            yearBuilt    = data.yearBuilt;
            lotSizeSqFt  = data.lotSizeSqFt;
            finishedSqFt = data.finishedSqFt;

            if ( yearBuilt    === '' ) { yearBuilt    = '1980';          }
            if ( finishedSqFt === '' ) { finishedSqFt = 0.5*lotSizeSqFt; }


            // Get the updated details
            if ( zpid > 0 )
            {
		jQuery.getJSON(ajax+"/zillow.php?c=?", {zpid:zpid}, function(data){
		    /* Variable Declaration */
		    var finishedSqFtE, yearBuiltE, numFloorsE;

		    finishedSqFtE = data.finishedSqFtE;
		    yearBuiltE    = data.yearBuiltE;
		    numFloorsE    = data.numFloorsE;
		    
		    if ( finishedSqFtE === '' ) { finishedSqFtE = finishedSqFt; }
		    if ( yearBuiltE    === '' ) { yearBuiltE    = yearBuilt; }
		    if ( numFloorsE    === '' ) { numFloorsE    = '1'; }

		    // Return Results
		    jQuery('#zpid').val(zpid);
		    jQuery('#street').val(street);
		    jQuery('#city').val(city);
		    jQuery('#state').val(state);
		    jQuery('#zipcode').val(zip);
		    jQuery('#lng').val(lng.toFixed(3));
		    jQuery('#lat').val(lat.toFixed(3));
		    jQuery('#val').val(0.5*value);
		    jQuery('#value').val(value);
		    jQuery('#year').val(yearBuiltE);
		    jQuery('#lsize').val(lotSizeSqFt);
		    jQuery('#hsize').val(finishedSqFtE);
		    jQuery('#floors').val(numFloorsE);

		    validateFields();
		});
            }

            jQuery('#loading').hide();
	});
    }

    function updateResponse() {
	/* Variable Declaration */
	var dist, mag, soil, Ca, Cb, Cd, C1, C2, Ce, Cc,
	    log_pga, pga, A, B, C, T, Sa, RV, a, b, c,
	    indx, x, DF;

	validateFields();

	// Estimate the PGA
	dist = distHaversine(mapMarkerH2.getPosition(), mapMarkerS2.getPosition());
	mag  = jQuery('#eqmag').val();
	soil = jQuery("input[name='soil']:checked").val();

	// Move the earthquake 10km down
	dist = Math.sqrt(dist*dist + 10*10);
	
	// Pga Parameters: Rock, Dirt
	Ca = [0.779   , 0.836   ];
	Cb = [2.55e-3 , 2.324e-3];
	Cd = [1.352   , 1.562   ];
	C1 = [1.478   , 2.423   ];
	C2 = [1.105   , 1.054   ];
	Ce = [-0.645  , -0.338  ];

	Cc = C1[soil] * (Math.atan(mag-5.0) + 1.4) * Math.exp(C2[soil]*(mag-5.0));
	log_pga = Ca[soil]*mag - Cb[soil]*(dist + Cc) - Cd[soil]*Math.log(dist + Cc)/Math.log(10) + Ce[soil];
	pga = Math.pow(10 , log_pga) / 9.80665;

        // A,B,C from Graf and Lee
        A = [ -1.07093 , -0.89917 , -0.95119 , -0.47366 , -0.81928 , -0.81325 , -1.06169 ];
        B = [  2.47522 ,  2.14296 ,  2.24974 ,  2.08034 ,  2.32500 ,  2.22125 ,  2.78331 ];
        C = [  1.54108 ,  1.09176 ,  0.96355 ,  0.58674 ,  1.11061 ,  1.16141 ,  1.35868 ];

        // Approximate Period (T)
        T = 0.0;
        if ( jQuery('#floors').val() === 1 )
        {
            if      ( num_strip(jQuery('#hsize').val()) > 2000 ) { T = 0.100; }
            else if ( num_strip(jQuery('#hsize').val()) > 1200 ) { T = 0.120; }
            else                                            { T = 0.150; }
        }
        else if ( jQuery('#floors').val() === 2 )
        {
            if      ( num_strip(jQuery('#hsize').val()) > 2000 ) { T = 0.150; }
            else if ( num_strip(jQuery('#hsize').val()) > 1200 ) { T = 0.175; }
            else                                            { T = 0.200; }
        }
        else { T = 0.250; }

        // Approximate Sa
        Sa = 0.0;
        if ( T <= 0.125 ) { Sa = 0.01 * pga * 11.70 * Math.pow( T , 0.704 ); }
        else              { Sa = 0.01 * pga * 2.71; }

        // Approximate R*V
        RV = 0.0;
        if      ( jQuery('#year').val() >  1997 + 9999 ) { RV = 0.01 * 2.5*pga; }
        else if ( jQuery('#year').val() >= 1991 ) { RV = 5.5*0.18; }
        else if ( jQuery('#year').val() >= 1982 ) { RV = 5.0*0.15; }
        else if ( jQuery('#year').val() >= 1973 ) { RV = 3.5*0.12; }
        else                                 { RV = 2.0*0.10; }

        // Damage Esitmation (adapted from Graf & Lee)
        indx = parseInt(jQuery('#frame').val(), 10);
        a = A[indx];
        b = B[indx];
        c = C[indx];

        x = Math.log(Sa / RV) / Math.log(10);

        DF = 0.0;
        if ( (a<x) && (x<=c) ) { DF =       (x-a)*(x-a)/(b-a)/(c-a); }
        if ( (c<x) && (x<=b) ) { DF = 1.0 - (b-x)*(b-x)/(b-a)/(b-c); }

	jQuery("#df").html(DF.toFixed(4));
	return [pga,DF];
    }

    init_home = new google.maps.LatLng( jQuery('#lat').val() , jQuery('#lng').val() );
    init_evnt = new google.maps.LatLng( 1+parseFloat(jQuery('#lat').val()) , 1+parseFloat(jQuery('#lng').val()) );

    mapOptions = {
	zoom: 6,
	center: new google.maps.LatLng(38,-120),
	mapTypeId: google.maps.MapTypeId.TERRAIN,
	disableDefaultUI: true,
	zoomControl: true,
	zoomControlOptions: {style: "SMALL"},
	draggable: true,
	scrollwheel: true
    };

    map1 = new google.maps.Map(document.getElementById("map1"), mapOptions);
    map2 = new google.maps.Map(document.getElementById("map2"), mapOptions);
    geocoder = new google.maps.Geocoder();

    map1.setCenter(init_home, 6);
    map2.setCenter(init_home, 6);

    forecast = new google.maps.KmlLayer(kmz+'/wo-forecast.kmz', {suppressInfoWindows: true, preserveViewport: true});
    forecast.setMap(map2);

    faults = new google.maps.KmlLayer(kmz+'/ucerf.kml', {suppressInfoWindows: false, preserveViewport: true});
    faults.setMap(map2);

    google.maps.event.addListener(map1,'zoom_changed',function(){
        if ( map1.getZoom() > 14 ) { map1.setMapTypeId(google.maps.MapTypeId.HYBRID);  }
        else                       { map1.setMapTypeId(google.maps.MapTypeId.TERRAIN); }
    }); 

    google.maps.event.addListener(map2,'zoom_changed',function(){
        if ( map2.getZoom() > 14 ) { map2.setMapTypeId(google.maps.MapTypeId.HYBRID);  }
        else                       { map2.setMapTypeId(google.maps.MapTypeId.TERRAIN); }
    }); 

    image = {
	url: tdir + 'img/house.png',
	size: new google.maps.Size(32, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    shadow = {
	url: tdir + 'img/house_shadow.png',
	size: new google.maps.Size(59, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    mapMarkerH1 = new google.maps.Marker({
	map: map1,
	position: init_home,
	icon: image,
	shadow: shadow,
	draggable: true,
	raiseOnDrag: false
    });

    image = {
	url: tdir + 'img/house-g.png',
	size: new google.maps.Size(32, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    shadow = {
	url: tdir + 'img/house_shadow.png',
	size: new google.maps.Size(59, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    mapMarkerH2 = new google.maps.Marker({
	map: map2,
	position: init_home,
	icon: image,
	shadow: shadow,
	draggable: false,
	raiseOnDrag: false
    });

    image = {
	url: tdir + 'img/event.png',
	size: new google.maps.Size(32, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    shadow = {
	url: tdir + 'img/event_shadow.png',
	size: new google.maps.Size(59, 32),
	origin: new google.maps.Point(0,0),
	anchor: new google.maps.Point(16, 32)
    };

    mapMarkerS2 = new google.maps.Marker({
	map: map2,
	position: init_home,
	icon: image,
	shadow: shadow,
	draggable: true,
	raiseOnDrag: false
    });

    google.maps.event.addListener(mapMarkerH1, "dragstart", function(ev) {
	jQuery('#searchstring').val('');
	jQuery('#searchstring2').val('');
    });

    google.maps.event.addListener(mapMarkerH1, "dragend", function(ev) {
	jQuery('#lat').val(ev.latLng.lat().toFixed(3));
	jQuery('#lng').val(ev.latLng.lng().toFixed(3));

	mapMarkerH2.setPosition(ev.latLng);
	zoomMaps();

	geocoder.geocode( {location: ev.latLng}, function(results, status) {
            if (status !== google.maps.GeocoderStatus.OK) {
		//alert("Status Code:" + response.Status.code);
            }
            else
            {
		var loc = results[0].formatted_address;
		jQuery('#searchstring').val(loc.substr(0,loc.lastIndexOf(',')));
		jQuery('#searchstring2').val(loc.substr(0,loc.lastIndexOf(',')));
		checkZillow();
            }
            updateResponse();
        });

    });

    google.maps.event.addListener(mapMarkerS2, "dragend", function(ev) {
	zoomMaps();
	updateResponse();
    });

    // Add search functionality
    jQuery('#searchstring').val('');
    jQuery('#searchstring2').val('');
    jQuery('#search').submit( function() {
	jQuery('#loading').show();

	geocoder.geocode( {address: jQuery('#searchstring').val()}, function(results, status) {
	    /* Variable Declaration */
	    var loc, latlng;

            if (status !== google.maps.GeocoderStatus.OK) {
		//alert("Status Code:" + response.Status.code);
            }
            else
            {
		loc = results[0].formatted_address;
		jQuery('#searchstring').val(loc.substr(0,loc.lastIndexOf(',')));
		jQuery('#searchstring2').val(loc.substr(0,loc.lastIndexOf(',')));

		latlng = results[0].geometry.location;

		mapMarkerH1.setPosition(latlng);
		mapMarkerH2.setPosition(latlng);

		map1.setCenter(latlng);
		map1.setMapTypeId(google.maps.MapTypeId.HYBRID);
		map1.setZoom(18);
		checkZillow();
            }
            updateResponse();
            jQuery('#loading').hide();
        });
	return false;
    });

    jQuery('#tool_submit').click( function() {
	/* Variable Declaration */
	var results, pga, DF, data, win, report_html, currentDate, doctext;

	results = updateResponse();

	pga = results[0];
	DF  = results[1];

	// Log the search
	data = {};
	data.u = uid;
	data.l = jQuery('#searchstring2').val();
	data.x = jQuery('#lng').val();
	data.y = jQuery('#lat').val();
	data.t = 2;
	data.d = "zpid:" + jQuery('#zpid').val() +
	         " yb:" + jQuery('#year').val() +
                 " nf:" + jQuery('#floors').val() +
                 " hs:" + num_strip(jQuery('#hsize').val()) +
	         " vl:" + num_strip(jQuery('#val').val()) +
                 " fr:" + jQuery('#frame').val() +
                 " so:" + jQuery("input[name='soil']:checked").val();

	jQuery.getJSON(ajax+"/log?c=?", data);

	/* Show the results */
	win = window.open("","","resizable=yes,scrollbars=yes,height=600,width=800");
	if ( win )
	{
	    report_html = 'Your test earthquake produced a simulated peak ground acceleration (PGA) of '+parseFloat(pga).toFixed(3)+'%g at your home location.  Given your description, the damage factor (DF) for this event is '+DF.toFixed(4)+'.  This means on average you would experience $'+num_format(1000*Math.ceil(DF*parseInt(num_strip(jQuery('#val').val()), 10)/1000))+' in damage (assuming a home value of '+jQuery('#val').val()+').';

            currentDate = new Date();
	    doctext = '';
	    
            doctext += '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">';
            doctext += '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">';
            doctext += '<head>';
            doctext += '<meta http-equiv="content-type" content="text/xml; charset=utf-8"/>';
            doctext += '<title>OpenHazards Report</title>';
            doctext += '<link rel="stylesheet" type="text/css" href="'+tdir+'report.css" />';
            doctext += '</head>';
            doctext += '<body>';
            doctext += '<div id="reportPrintTool"><img src="'+tdir+'img/print.gif" alt="Print this page" onclick="javascript:if(window.print)self.print();"/></div>';
            doctext += '<div id="reportHeader">Risk Assessment For User Generated Home Values</div>';
            doctext += '<div>Report Generated: '+currentDate+'</div>';
            doctext += '<p>'+report_html+'</p>';
            doctext += '<div class="center"><img src="http://maps.google.com/maps/api/staticmap?center='+map2.getCenter().lat()+','+map2.getCenter().lng()+'&amp;zoom='+map2.getZoom()+'&amp;size=400x400&amp;maptype=terrain&amp;markers=color:green%7Clabel:H%7C'+mapMarkerH2.getPosition().lat()+','+mapMarkerH2.getPosition().lng()+'&amp;markers=color:red%7C'+mapMarkerS2.getPosition().lat()+','+mapMarkerS2.getPosition().lng()+'&amp;sensor=false&amp;key=ABQIAAAADdFP0SYUjnilQ6db7eZHTxTHnomy09joXkSmbiHcYnNainvjeBRQUdqCgup8E7anBm2yU-IEqAZz2g" alt="OpenHazards.com | Home Response" border="0"/></div>';
	    doctext += '<div>';
	    doctext += '<table>';
	    doctext += '<tr><td>Address:</td><td>'+ jQuery('#searchstring2').val() + '</td></tr>';
	    doctext += '<tr><td>Earthquake Location:</td><td>'+ mapMarkerS2.getPosition().lat().toFixed(3) + '&deg;N, '+mapMarkerS2.getPosition().lng().toFixed(3)+'&deg;E</td></tr>';
	    doctext += '<tr><td>Magnitude:</td><td>'+ jQuery('#eqmag').val() +'</td></tr>';
	    doctext += '<tr><td>Estimated PGA (%g):</td><td>'+ parseFloat(pga).toFixed(3) +'</td></tr>';
	    doctext += '<tr><td>Damage Factor:</td><td>'+ DF.toFixed(4) +'</td></tr>';
	    doctext += '<tr><td>Estimated Damage:</td><td style="color:red">$'+ num_format(1000*Math.ceil(DF*parseInt(num_strip(jQuery('#val').val()), 10)/1000)) +'</td></tr>';
	    doctext += '</table>';
	    doctext += '</div>';

            doctext += '<div id="reportFooter">Copyright (&copy;) 2009-2013 <strong>OpenHazards Group</strong> | All rights reserved.</div>';
            doctext += '</body>';
            doctext += '</html>';

            win.document.open();
            win.document.write(doctext);
            win.document.close();
	}
    });

    jQuery("#home-response").accordion({activate: zoomMaps, change: zoomMaps});

    updateResponse();

    jQuery("input[type='text']").blur(updateResponse);
    jQuery("input[type='radio']").change(updateResponse);
    jQuery("select").change(updateResponse);
}
