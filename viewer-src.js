/*jslint white:false, onevar:false, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true */
/*global jQuery google StyledMarker StyledIcon StyledIconTypes window editPolygon ajax kmz tdir CustomGetTileUrl */

String.prototype.format = function() {
    var i, regexp, formatted = this;

    for (i=0; i<arguments.length; i+=1) {
        regexp = new RegExp('\\{'+i+'\\}', 'gi');
        formatted = formatted.replace(regexp, arguments[i]);
    }
    return formatted;
};

function init_viewer(uid) {
    /* Global variables (accessed accross multiple functions) */
    var map;            /* Storage for google map object      */
    var drawingManager; /* Drawing Tools Control              */
    var geocoder;       /* Storage for google geocoder object */
    var infowindow;
    var mapMarkerS;     /* Storage for map query marker       */
    var mapMarkerH;     /* Storage for map query marker       */
    var mapPolygon;     /* Storage for map query polygon      */
    var mapCircle;      /* Storage for map query circle       */
    var circle_ctr;
    var circle_rad;
    var click_pt;

    /* jsLint prefers '{}' notation to 'new Object()' */
    var layers = {};
    var forecast = undefined;
    var MapserverLayer = undefined;
    var center_marker;
    var query_date = {
	year: new Date().getFullYear(),
	month: (parseInt(new Date().getMonth(), 10)+1),
	day:1
    };

    query_date.datestr = query_date.year + "/" + query_date.month + "/" + query_date.day;

    jQuery("#monthpicker").monthpicker({
	elements: [
	    {tpl:"year",opt:{
		range: "-5~0"
	    }},
	    {tpl:"month",opt:{
		type: "dropdown"
	    }}	
	],
	onChanged: function(data,$e){
	    if ( data.year === new Date().getFullYear() ) {
		var month = parseInt(new Date().getMonth(), 10)+1;

		if ( data.month > month ) {
		    jQuery('#monthpicker a.selected:last').toggleClass("selected");
		    jQuery("#monthpicker a[title='"+month+"']").toggleClass("selected");
		}
	    }

	    jQuery('#monthpicker span.selected:last').html(jQuery('#monthpicker a.selected:last').html());
	    query_date = data;
	    query_date.day = 1;
	    query_date.datestr = query_date.year + "/" + query_date.month + "/" + query_date.day;
	    
	    jQuery('#forecasts').change();
	}
    });
    jQuery('#monthpicker span.selected:last').html(jQuery('#monthpicker a.selected:last').html());

    function myResize()
    {
	var height = jQuery('#viewer_right').height() - 50;
	height = Math.max(height, 200);
    
	//jQuery('#viewer_map').height( height );

	if ( map ) { google.maps.event.trigger(map, "resize"); }
    }

    function geocode(address)
    {
	geocoder.geocode({address: address}, function(results, status) {
            /* Variable Declaration */
	    var loc;

	    if (status !== google.maps.GeocoderStatus.OK) {
		jQuery('#viewer_alert').html('<p>Address not found: ' + address + '</p>');
		jQuery('#viewer_alert').dialog('option', 'title', 'Warning');
		jQuery('#viewer_alert').dialog('open');
	    }
            else
	    {
		var lat = results[0].geometry.location.lat();
		var lng = results[0].geometry.location.lng();
		    
		map.setCenter(results[0].geometry.location);
		//map.setZoom(15);

		// Log the search
		jQuery.getJSON(ajax+"/log?c=?", {u:uid, l:address, x:lng, y:lat, t:0});
	    }
	});
    }

    function rad(x) {return x*Math.PI/180;}
    function distHaversine(p1, p2) {
        var R, dLat, dLong, a, c;

        R = 6371; // earth's mean radius in km
        dLat  = rad(p2.lat() - p1.lat());
        dLong = rad(p2.lng() - p1.lng());

        a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) * Math.sin(dLong/2) * Math.sin(dLong/2);
        c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R*c;
    }

    function color(p) {
	var r, g, b;

	if ( p > 1.0 ) {
            p = 1.0;
	}

	if ( p < 0.5 ) {
        // first, green stays at 100%, red raises to 100%
            r = 2.0 * p;
            g = 1.0;
            b = 0.0;
	} else {
        // then red stays at 100%, green decays
            r = 1.0;
            g = 2.0 - 2*p;
            b = 0.0;
	}

	r = Math.round(r * 255).toString(16);
	g = Math.round(g * 255).toString(16);
	b = Math.round(b * 255).toString(16);

	if ( r.length < 2 )  { r = "0" + r; }
	if ( g.length < 2 )  { g = "0" + g; }
	if ( b.length < 2 )  { b = "0" + b; }

	return "#" + r + g + b;
    }

    function toggleState(state)
    {
	/* Remove forecast overlay */
	jQuery("select#forecasts").val('');
	jQuery("input:radio[name=overlay]").val(["none"]);

	if ( forecast === MapserverLayer )
	{
	    map.overlayMapTypes.pop();
	    forecast=undefined;
	}
	if ( forecast !== undefined )
	{
	    forecast.setMap(null);
	    forecast=undefined;
	}

	/* Remove any currently selected regions */
	if ( mapPolygon !== undefined )
	{
	    mapPolygon.setMap(null);
	    mapPolygon.setEditable(false);
	    mapPolygon=undefined;
	}

	if ( circle_ctr !== undefined )
	{
	    circle_ctr.setMap(null);
	    circle_rad.setMap(null);
	    circle_ctr=undefined;
	    circle_rad=undefined;
	}

	if ( state !== '#circleTool' && jQuery('#circleTool').attr('checked')===true )
	{
	    google.maps.event.removeListener(mapCircle);
	}

	/* Hide any map markers */
	mapMarkerH.setMap(null);
	mapMarkerS.setMap(null);

	/* Reset the selection toggles */
	if ( state !== '#circleTool')  { jQuery('#circleTool').attr('checked', false); }
	if ( state !== '#polygonTool') { jQuery('#polygonTool').attr('checked', false); }
	if ( state !== '#pointTool')   { jQuery('#pointTool').attr('checked', false); }

	jQuery('#pga').hide();

	jQuery('div#queryDiv').html('');

	jQuery('#benioff').get(0).disabled = true;
	jQuery('#timeseries').get(0).disabled = true;
	jQuery('#shakeReport').get(0).disabled = true;

	if ( uid > 0 )
	{
	    jQuery('#saveregion').get(0).disabled = true;
	}

    }

    function queryPolygon()
    {
	var bounds = [];

	var text = '<div class="blockHeadline">Selected Region</div><div class="blockLeft">';

	jQuery('div#queryDiv').html('<img id="loading" src="'+tdir+'img/loading.gif" alt="Loading..." style="display:block; position:static"/>');

	if ( mapPolygon.name !== undefined )
	{
	    text += '<p>' + mapPolygon.name + '</p>';
	}

	var path = mapPolygon.getPath().getArray();

	for (var i=0; i<path.length; i+=1 )
	{
	    var lat = path[i].lat().toFixed(3);
	    var lng = path[i].lng().toFixed(3);

	    bounds += lat + " " + lng + " ";
	}
	bounds += path[0].lat().toFixed(3) + " " + path[0].lng().toFixed(3);


	var opts = 'b='+bounds;
	if ( mapPolygon.name !== undefined )
	{
	    opts += '&n='+mapPolygon.name;
	}

	jQuery.getJSON(ajax+"/getprob?c=?", {bounds:bounds, date:query_date.datestr}, function(data) {
	    var probs = {};
	    var prob = 0;

	    jQuery.each(data.rates, function(i,rate) {
		if ( rate !== undefined )
		{
		    prob = (100 - 100*(Math.exp(-parseFloat(rate.value))));

		    if ( prob > 99.9 )
		    {
			prob = "99.9%";
		    }
		    else if ( prob < 0.05 )
		    {
			prob = "&lt;0.1%";
		    }
		    else
		    {
			prob = prob.toFixed(1) + "%";
		    }

		    probs[[rate.mag, rate.win]] = prob;
		}
	    });

	    text += "<table border='1' style='font-size:xx-small'>";
	    text += "<tr><th>&nbsp;</th><th>1 Mo</th><th>1 Yr</th><th>3 Yr</th></tr>";
	    text += "<tr><td>M&ge;5</td><td>"+probs[["5.0","30"]]+"</td><td>"+probs[["5.0","365"]]+"</td><td>"+probs[["5.0","1095"]]+"</td><tr>";
	    text += "<tr><td>M&ge;6</td><td>"+probs[["6.0","30"]]+"</td><td>"+probs[["6.0","365"]]+"</td><td>"+probs[["6.0","1095"]]+"</td><tr>";
	    text += "<tr><td>M&ge;7</td><td>"+probs[["7.0","30"]]+"</td><td>"+probs[["7.0","365"]]+"</td><td>"+probs[["7.0","1095"]]+"</td><tr>";
	    text += "<tr><td>M&ge;8</td><td>"+probs[["8.0","30"]]+"</td><td>"+probs[["8.0","365"]]+"</td><td>"+probs[["8.0","1095"]]+"</td><tr>";
	    text += "</table>";
	    
	    text += "</div>";

	    jQuery('div#queryDiv').html(text);
	});	
    }

    function drawPolygon(coords, name, editable)
    {
	coords = ( (coords === undefined) ? [] : coords );
	name = name;
	editable = ( (editable === undefined) ? true : editable );
	
	if ( mapPolygon !== undefined )
	{
	    mapPolygon.setMap(null);
	    mapPolygon.setEditable(false);
	    mapPolygon=undefined;
	}
	
	if ( coords.length === 0 )
	{
	    drawingManager.setOptions({drawingMode: google.maps.drawing.OverlayType.POLYGON});

	    google.maps.event.addListener(drawingManager, "overlaycomplete", function(event) {
		drawingManager.setOptions({drawingMode: null});
		mapPolygon = event.overlay;

		jQuery('#polygonTool').attr('checked', false);

		if ( uid > 0 )
		{
		    jQuery('#saveregion').get(0).disabled = false;
		}
		jQuery('#benioff').get(0).disabled = false;
		jQuery('#timeseries').get(0).disabled = false;
	    
		google.maps.event.addListener(mapPolygon, "mouseup", queryPolygon);
		queryPolygon();

		if ( editable === true )
		{
		    google.maps.event.addListener(mapPolygon, "mouseover", function() { mapPolygon.setEditable(true); });
		    google.maps.event.addListener(mapPolygon, "mouseout", function() { mapPolygon.setEditable(false); });
		}

		google.maps.event.addListener(mapPolygon, "click", function() {
		    jQuery('#viewer_alert').html('');
		    jQuery('#viewer_alert').dialog('option', 'title', 'Remove Selection?');
		    jQuery('#viewer_alert').dialog('option', 'buttons', {
			'OK': function() {
			    toggleState();
			    jQuery(this).dialog('close');
			},
			Cancel: function() {
			    jQuery(this).dialog('close');
			}
		    });
		    jQuery('#viewer_alert').dialog('open');
		});
	    });
	}
	else
	{
	    mapPolygon = new google.maps.Polygon({
		map: map,
		paths: coords,
		clickable: true,
		strokeColor: 'black',
		strokeWeight: 3,
		strokeOpacity: 0.25,
		fillColor: 'blue',
		fillOpacity: 0.40
            });

	    mapPolygon.name = name;
	    map.fitBounds(mapPolygon.getBounds());

	    if ( editable === true )
	    {
		google.maps.event.addListener(mapPolygon, "mouseover", function() { mapPolygon.setEditable(true); });
		google.maps.event.addListener(mapPolygon, "mouseout", function() { mapPolygon.setEditable(false); });
	    }

	    google.maps.event.addListener(mapPolygon, "click", function() {
		jQuery('#viewer_alert').html('');
		jQuery('#viewer_alert').dialog('option', 'title', 'Remove Selection?');
		jQuery('#viewer_alert').dialog('option', 'buttons', {
		    'OK': function() {
			toggleState();
			jQuery(this).dialog('close');
		    },
		    Cancel: function() {
			jQuery(this).dialog('close');
		    }
		});
		jQuery('#viewer_alert').dialog('open');
	    });
	}
    }

    function loadPolygon(latlngs, name, editable)
    {
	jQuery('#circleTool').attr('checked', false);
	jQuery('#polygonTool').attr('checked', false);
	
	jQuery('#pointTool').attr('checked', false);
	jQuery('#shakeReport').get(0).disabled = true;
	
	var coords = [];
	
	latlngs = latlngs.split(' ');
	
	for (var i=0; i<Math.floor(latlngs.length/2); i+=1)
	{
	    coords.push( new google.maps.LatLng(parseFloat(latlngs[2*i]),parseFloat(latlngs[2*i+1])) );
	}
	
	drawPolygon(coords, name, editable);
	
	if ( uid > 0 )
	{
	    jQuery('#saveregion').get(0).disabled = false;
	}
	jQuery('#benioff').get(0).disabled = false;
	jQuery('#timeseries').get(0).disabled = false;
	queryPolygon();
	
	return;
    }

    function loadPortfolio()
    {
	var text = '';

	jQuery.getJSON(ajax+"/portfolio?c=?", {uid:uid}, function(data){
	    /* Loop over groups */
	    jQuery.each(data.regions, function(i,region) {
		if ( region !== undefined )
		{
		    text += '<tr><td><a class="viewer-region" href="#" rel="' + region.coords + ',' + region.title + '">' + region.title + '</a></td><td><a class="viewer-region-edit" href="#" rel="' + region.title + '">edit</a></td></tr>';
		}
	    });

	    /* Update the select box */
	    jQuery('#portfolio').html('<table>' + text + '</table>');

	    /* Update the click logic */
	    jQuery('a.viewer-region').click( function() {
		var params = this.rel.split(",");
		loadPolygon(params[0],params[1]);
		return false;
	    });
      
	    jQuery('a.viewer-region-edit').click( function() {
		editPolygon(this.rel);
		return false;
	    });
	});
  
	return;
    }

    function editPolygon(title)
    {
	jQuery('#ptext').html('Enter new name for location (blank to delete):');
	jQuery('#pvalue').val(title);
	jQuery('#viewer_prompt').dialog('option', 'title', 'Edit Region');
	jQuery('#viewer_prompt').dialog('option', 'buttons', {
	    'OK': function() {
		jQuery.getJSON(ajax+"/portfolio?c=?", {uid:uid, title:title, name:jQuery('#pvalue').val()}, loadPortfolio);
		jQuery(this).dialog('close');
	    },
	    Cancel: function() {
		jQuery(this).dialog('close');
	    }
	});
	jQuery('#viewer_prompt').dialog('open');
	jQuery('#pvalue').select();
    }

    function drawCircle(center, radius) {
	var lat = center.lat();
	var lng = center.lng();

	var d2r = Math.PI / 180;
	var circleLatLngs = [];
	var circleLat = radius * 0.008999;  // Convert statute kms into degrees latitude
	var circleLng = circleLat / Math.cos(lat * d2r);

	// 2PI = 360 degrees, +1 so that the end points meet
	for (var i=0; i<=24; i+=1) {
	    var theta = Math.PI * (i / 12); 
	    var vertexLat = lat + circleLat * Math.sin(theta); 
	    var vertexLng = lng + circleLng * Math.cos(theta);
	    circleLatLngs.push(new google.maps.LatLng(vertexLat, vertexLng));
	}

	var circle = new google.maps.Polygon({
	    paths: circleLatLngs,
            clickable: true,
            strokeColor: 'black',
            strokeWeight: 3,
            strokeOpacity: 0.25,
	    fillColor: 'blue',
	    fillOpacity: 0.40
        });

	google.maps.event.addListener(circle, "click", function() {
	    jQuery('#viewer_alert').html('');
	    jQuery('#viewer_alert').dialog('option', 'title', 'Remove Selection?');
	    jQuery('#viewer_alert').dialog('option', 'buttons', {
		'OK': function() {
		    toggleState();
		    jQuery(this).dialog('close');
		},
		Cancel: function() {
		    jQuery(this).dialog('close');
		}
	    });
	    jQuery('#viewer_alert').dialog('open');
	});
	
	return circle;
    }

    function loadLocations()
    {
	/* Load locations select box */
	var options = '<option value="" selected="selected">CA Counties</option>';
	jQuery.getJSON(ajax+"/locations?c=?", function(data) {
	    jQuery.each(data.locations, function(i,location) {
		if ( location !== undefined )
		{
		    options += '<option value="' + location.id + '">' + location.name + '</option>';
		}
	    });

	    jQuery('#locations').html(options);
	});

	/* Update the select box */
	jQuery('#locations').change(function() {
	    if ( jQuery('#locations').val() !== "" )
	    {
		jQuery.getJSON(ajax+"/locations?c=?", {id:jQuery('#locations').val()}, function(data) {
		    var coords = data.coords;
		    var name   = data.name;

		    loadPolygon(coords,name,false);
		});
	    }
	});

	if ( uid > 0 )
	{
	    /* Add "Save Region" logic */
	    jQuery('#saveregion').get(0).disabled = true;
	    jQuery('#saveregion').click(function(){

		jQuery('#ptext').html('Enter a name for this location:');
		jQuery('#pvalue').val('');
		jQuery('#viewer_prompt').dialog('option', 'title', 'Save Region');
		jQuery('#viewer_prompt').dialog('option', 'buttons', {
		    'OK': function() {
			var title = jQuery('#pvalue').val();

			var coords = '';
			var path = mapPolygon.getPath().getArray();

			for (var i=0; path.length; i+=1 )
			{
			    coords += path[i].lat() + ' ' + path[i].lng() + ' ';
			}

			jQuery.getJSON(ajax+"/portfolio?c=?", {uid:uid, title:title, coords:coords}, loadPortfolio);
			jQuery('div#queryDiv').html('<div class="blockHeadline">Selected Region</div><div class="blockLeft"><p>'+title+'</p></div>');
			
			jQuery(this).dialog('close');
		    },
		    Cancel: function() {
			jQuery(this).dialog('close');
		    }
		});
		jQuery('#viewer_prompt').dialog('open');
		jQuery('#pvalue').select();
		
	    });
	}

	return;
    }

    function markerListener() {
	infowindow.setContent(this.info.toString());
	infowindow.open(map, this);
    }


    function addLayers()
    {
	//layers.bigeq = new google.maps.KmlLayer('http://earthquake.usgs.gov/eqcenter/catalogs/7day-M2.5.xml',
	//					{preserveViewport: true});
	layers.ucerf = new google.maps.KmlLayer(kmz+'/ucerf.kml',
						{preserveViewport: true});

	var info_template = '<div id="info"><p><label>Location:</label><span>{0}</span></p><p><label>Date:</label><span>{1}</span><br/></p><p><label>Magnitude:</label><span>{2}</span><br/></p><p><label>Info:</label><span><a href="{3}">{3}</a></span></p></div>';

	layers.bigeq = [];
	jQuery.getJSON(tdir+'ajax/usgsproxy', function(data) {
	    var features = data.features;
	    //for (var i=0; i<features.length; i+=1) {
	    for (var i=features.length-1; i>=0; i=i-1) {
		var place = features[i].properties.place;
		var info = features[i].properties.url;
		var date = new Date(features[i].properties.time);
		var mag  = features[i].properties.mag;
		var lat  = features[i].geometry.coordinates[1];
		var lng  = features[i].geometry.coordinates[0];
                var pos  = new google.maps.LatLng(lat, lng);

		var marker = new StyledMarker({
                    styleIcon: new StyledIcon(StyledIconTypes.MARKER, {
                        color: color(mag/8.0)
                    }),
                    position: pos,
		    title: "M: " + mag.toString(10),
		    info: info_template.format(place, date, mag, info)
                });

		layers.bigeq.push(marker);
		google.maps.event.addListener(marker, 'click', markerListener);
	    }
	});

	/* Add satelite imagery option to the map */
	jQuery('#maptype').attr('checked', false);
	jQuery('#maptype').click(function(){
	    if ( jQuery('#maptype').is(':checked') )
	    {
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	    }
	    else
	    {
		if ( map.getZoom() > 15 )
		{
		    map.setMapTypeId(google.maps.MapTypeId.HYBRID);
		}
		else
		{
		    map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
		}
	    }
	});

	/* Add "UCERF" functionality to sidebar layers */
	jQuery('#ucerf').attr('checked', false);
	jQuery('#ucerf').click(function() {
	    if ( jQuery('#ucerf').is(':checked') )
	    {
		if ( forecast === MapserverLayer )
		{
		    map.overlayMapTypes.pop();
		    forecast=undefined;
		}
		if ( forecast !== undefined )
		{
		    forecast.setMap(null);
		    layers.ucerf.setMap(map);
		    forecast.setMap(map);
		}
		else
		{
		    layers.ucerf.setMap(map);
		}
	    }
	    else
	    {
		layers.ucerf.setMap(null);
	    }
	});

	/* Add "Week's Earthquakes" functionality to sidebar layers */
	jQuery('#bigeq').attr('checked', false);
	jQuery('#bigeq').click(function() {
	    var i;

	    if ( jQuery('#bigeq').is(':checked') )
	    {
		if ( forecast === MapserverLayer )
		{
		    map.overlayMapTypes.pop();
		    forecast=undefined;
		}
		if ( forecast !== undefined )
		{
		    forecast.setMap(null);
		    //layers.bigeq.setMap(map);
		    for (i=0; i<layers.bigeq.length; i+=1)
		    {
			layers.bigeq[i].setMap(map);
		    }
		    forecast.setMap(map);
		}
		else
		{
		    //layers.bigeq.setMap(map);
		    for (i=0; i<layers.bigeq.length; i+=1)
		    {
			layers.bigeq[i].setMap(map);
		    }
		}
	    }
	    else
	    {
		//layers.bigeq.setMap(null);
		for (i=0; i<layers.bigeq.length; i+=1)
                {
                    layers.bigeq[i].setMap(null);
                }
	    }
	});
    }

    function zoomto(lat, lng)
    {
	var i;

	map.setCenter(new google.maps.LatLng(lat, lng));
	map.setZoom(13);

	if ( ! jQuery('#bigeq').is(':checked') )
	{
	    jQuery('#bigeq').attr('checked',true);

	    if ( forecast === MapserverLayer )
	    {
		map.overlayMapTypes.pop();
		forecast=undefined;
	    }
	    if ( forecast !== undefined )
	    {
		forecast.setMap(null);
		//layers.bigeq.setMap(map);
		for (i=0; i<layers.bigeq.length; i+=1)
                {
                    layers.bigeq[i].setMap(map);
                }
	    }
	    else
	    {
		//layers.bigeq.setMap(map);
		for (i=0; i<layers.bigeq.length; i+=1)
                {
                    layers.bigeq[i].setMap(map);
                }
	    }
	}

	return false;
    }

    function addQuakeForecasts()
    {
	/* Load Forecast select box */
	var options = '<option value="" selected="selected">Select Forecast</option><option value="---">---</option>';

	options += '<option value="wo">Global Forecast (M&gt;6.5)</option>';
	options += '<option value="ca">California Forecast (M&gt;5.0)</option>';
	options += '<option value="jp">Japan Forecast (M&gt;6.5)</option>';

	/* Update the select box */
	jQuery('#forecasts').html(options);
	jQuery('#forecasts').change(function() {
	    if ( forecast === MapserverLayer )
	    {
		map.overlayMapTypes.pop();
		forecast=undefined;
	    }
	    if ( forecast !== undefined )
	    {
		forecast.setMap(null);
		forecast=undefined;
	    }

	    jQuery("input:radio[name=overlay]").val(["none"]);
	    if ( jQuery('#forecasts').val() !== "" )
	    {
		var file = jQuery('#forecasts').val();
		var kml = kmz+'/forecast?file='+file+'&year='+query_date.year+'&month='+query_date.month;

		forecast = new google.maps.KmlLayer(kml, {suppressInfoWindows: true, preserveViewport: true});
		forecast.setMap(map);
	    }
	});
    }

    function addQuakeTools()
    {
	/* Add listener to query database when circle is requested */
	jQuery('#circleTool').attr('checked', false);
	jQuery('#circleTool').click(function(){
	    toggleState('#circleTool');

	    if ( jQuery('#circleTool').attr('checked') )
	    {
		// Wait for click..
		mapCircle = google.maps.event.addListener(map, "click", function(ev) {
		    google.maps.event.removeListener(mapCircle);

		    click_pt = ev.latLng;
		    jQuery('#circleTool').attr('checked', false);

		    jQuery('#ptext').html('Please enter a radius for the selected region (km).');
		    jQuery('#pvalue').val('100');
		    jQuery('#viewer_prompt').dialog('option', 'title', 'Selection Radius');
		    jQuery('#viewer_prompt').dialog('option', 'buttons', {
			'Enter': function() {
			    var radius = jQuery('#pvalue').val();
			    radius = parseInt(radius, 10);
			    if ( isNaN(radius) || radius <= 0 )
			    {
				jQuery('#pvalue').val('');
				jQuery('#pvalue').select();
				return;
			    }
			    
			    mapPolygon = drawCircle(click_pt, radius);
			    mapPolygon.setMap(map);
			    map.fitBounds(mapPolygon.getBounds());
			    queryPolygon();

			    var image = {
				url: tdir + 'img/marker_move_icon.png',
				size: new google.maps.Size(32, 32),
				origin: new google.maps.Point(0,0),
				anchor: new google.maps.Point(16, 16)
			    };

			    circle_ctr = new google.maps.Marker({
				map: map,
				position: click_pt,
				icon: image,
				draggable: true,
				raiseOnDrag: false
			    });

			    circle_rad = new google.maps.Marker({
				map: map,
				position: mapPolygon.getPath().getAt(0),
				icon: image,
				draggable: true,
				raiseOnDrag: false
			    });
			    circle_rad.r = radius;

			    jQuery('#benioff').get(0).disabled = false;
			    jQuery('#timeseries').get(0).disabled = false;

			    if ( uid > 0 )
			    {
				jQuery('#saveregion').get(0).disabled = false;
			    }

			    google.maps.event.addListener(circle_ctr, "drag", function(ev) {
				jQuery('div#queryDiv').html('');
			
				if (mapPolygon) {
				    mapPolygon.setMap(null);
				    mapPolygon=undefined;
				}
				mapPolygon = drawCircle(ev.latLng, circle_rad.r);
				mapPolygon.setMap(map);

				circle_rad.setPosition(mapPolygon.getPath().getAt(0));
			    });

			    google.maps.event.addListener(circle_rad, "drag", function(ev) {
				var position = circle_ctr.getPosition();
				circle_rad.r = distHaversine(position, ev.latLng);

				if (mapPolygon) {
				    mapPolygon.setMap(null);
				    mapPolygon=undefined;
				}
				mapPolygon = drawCircle(position, circle_rad.r);
				mapPolygon.setMap(map);
			    });

			    google.maps.event.addListener(circle_ctr, "dragend", queryPolygon);
			    google.maps.event.addListener(circle_rad, "dragend", queryPolygon);
	  
			    jQuery(this).dialog('close');
			},
			Cancel: function() {
			    jQuery(this).dialog('close');
			}
		    });
		    jQuery('#viewer_prompt').dialog('open');
		    jQuery('#pvalue').select();
		});
	    }
	    else
	    {
		/* Deactivate the Circle tool */
		google.maps.event.removeListener(mapCircle);
	    }
	});

	/* Add listener to query database when polygon is drawn */
	jQuery('#polygonTool').attr('checked', false);
	jQuery('#polygonTool').click(function(){
	    toggleState('#polygonTool');
	    if ( jQuery('#polygonTool').attr('checked') )
	    {
		/* Start digitizing */
		drawPolygon();
	    }
	});

//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  var today = new Date();

  jQuery('#benioff').get(0).disabled = true;
  jQuery('#benioff').click(function(){
      var bounds = '';
      var path = mapPolygon.getPath().getArray();

      for (var i=0; i<path.length; i+=1 )
      {
	var lat = path[i].lat().toFixed(3);
	var lng = path[i].lng().toFixed(3);

	bounds += lat + " " + lng + " ";
      }
      bounds = bounds.replace(' ','+');

      var opts = "bounds="+bounds;
      window.open(tdir+"energy?"+opts, "OpenHazards","toolbars=no,resizable=no,height=640,width=800");
    });

  jQuery('#timeseries').get(0).disabled = true;
  jQuery('#timeseries').click(function(){
      var bounds = '';
      var path = mapPolygon.getPath().getArray();

      for (var i=0; i<path.length; i+=1 )
      {
	var lat = path[i].lat().toFixed(3);
	var lng = path[i].lng().toFixed(3);

	bounds += lat + " " + lng + " ";
      }
      bounds = bounds.replace(' ','+');

      var opts = "bounds="+bounds;
      window.open(tdir+"timeseries?"+opts, "OpenHazards","toolbars=no,resizable=no,height=640,width=800");
    });
}

    function calcPGA()
    {
	var dist, mag, dep, soil, Ca, Cb, Cd, C1, C2, Ce, Cc, log_pga, pga;

	// Estimate the PGA
	dist = distHaversine(mapMarkerH.getPosition(), mapMarkerS.getPosition());
	mag  = jQuery('#pgamag').val();
	dep  = jQuery('#pgadep').val();
	soil = jQuery("input[name='soil']:checked").val();

	// Move the earthquake 10km down
	dist = Math.sqrt(dist*dist + dep*dep);

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

	jQuery('#pgaval').val(pga.toFixed(4));
    }

    function addShakingTools()
    {
	var image, shadow;

	/* Add report button */
	jQuery('#shakeReport').get(0).disabled = true;
	jQuery('#shakeReport').click(function(){
	    var opts = 'latlngH='+mapMarkerH.getPosition().toString()+'&latlngS='+mapMarkerS.getPosition().toString()+'&pga='+jQuery('#pgaval').val();
	    window.open(tdir+"report_pga?"+opts,"","toolbars=no,resizable=yes,scrollbars=yes,height=600,width=800");
	});

	jQuery("input[name='soil']").get(0).checked = true;
	jQuery("input[name='soil']").change( calcPGA );

	jQuery('#pgalat, #pgalng, #pgamag, #pgadep').change(function() {
	    var lat = jQuery('#pgalat').val();
	    var lng = jQuery('#pgalng').val();

	    mapMarkerS.setPosition(new google.maps.LatLng(lat,lng));

	    calcPGA();
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

	mapMarkerH = new google.maps.Marker({
            position: map.getCenter(),
            icon: image,
            shadow: shadow,
            draggable: true,
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

	mapMarkerS = new google.maps.Marker({
            position: new google.maps.LatLng(
		map.getCenter().lat()+1,
		map.getCenter().lng()-1
	    ),
            icon: image,
            shadow: shadow,
            draggable: true,
            raiseOnDrag: false
	});

	/* Add listener to query database when marker is dragged to a location */
	jQuery('#pga').hide();
	jQuery('#pointTool').attr('checked', false);
	jQuery('#pointTool').click(function(){
	    toggleState('#pointTool');

	    if ( jQuery('#pointTool').attr('checked') )
	    {
		jQuery('#shakeReport').get(0).disabled = false;

		/* Show the marker */
		var bounds = map.getBounds();

		if ( bounds.contains( mapMarkerH.getPosition() ) === false )
		{
		    mapMarkerH.setPosition(map.getCenter());
		}

		if ( bounds.contains( mapMarkerS.getPosition() ) === false )
		{
		    var position = new google.maps.LatLng(0.2*map.getBounds().getNorthEast().lat()+0.8*map.getCenter().lat(),
							  0.2*map.getBounds().getSouthWest().lng()+0.8*map.getCenter().lng());
		    mapMarkerS.setPosition(position);
		}

		mapMarkerH.setMap(map);
		mapMarkerS.setMap(map);

		jQuery('#pga').show();

		var latlng = mapMarkerS.getPosition();
		jQuery('#pgalat').val(latlng.lat().toFixed(3));
		jQuery('#pgalng').val(latlng.lng().toFixed(3));
	    }
	});

	google.maps.event.addListener(mapMarkerH, 'drag', function(ev) {
	    calcPGA();
	});

	google.maps.event.addListener(mapMarkerS, 'drag', function(ev) {
	    jQuery('#pgalat').val(ev.latLng.lat().toFixed(3));
	    jQuery('#pgalng').val(ev.latLng.lng().toFixed(3));

	    calcPGA();
	});
    }

    function addMiscTools()
    {
	function WMSGetTileUrl(tile, zoom) {
	    var projection = map.getProjection();
	    var zpow = Math.pow(2,zoom);
	    var ul = new google.maps.Point(tile.x*256.0/zpow, (tile.y+1)*256.0/zpow);
	    var lr = new google.maps.Point((tile.x+1)*256.0/zpow, (tile.y)*256.0/zpow);
	    var ulw = projection.fromPointToLatLng(ul);
	    var lrw = projection.fromPointToLatLng(lr);

	    var baseURL = "https://hazards.fema.gov/gis/nfhl/services/public/NFHLWMS/MapServer/WMSServer?";
	    var format = "image/png";
	    var layers = "4,5,32";
	    var styles = ""; //styles to use for the layers

	    var srs = "EPSG:4326";
	    var bbox = ulw.lng() + "," + ulw.lat() + "," + lrw.lng() + "," + lrw.lat();
	    var url = baseURL + "version=1.1.1&request=GetMap&Layers=" + layers + "&Styles=" + styles + "&SRS="+ srs +"&BBOX=" + bbox + "&width=" + this.tileSize.width +"&height=" + this.tileSize.height + "&format=" + format + "&transparent=true";

	    return url;
	}

	// Add FEMA WMS features
	MapserverLayer = new google.maps.ImageMapType({
	    alt: "FEMA",
	    getTileUrl: WMSGetTileUrl,
	    isPng: true,
	    maxZoom: 20,
	    minZoom: 0,
	    name: "WMS",
	    opacity: 0.5,
	    tileSize: new google.maps.Size(256, 256)
	});
  
	jQuery('a.viewer-eq').click( function() {
	    var latlng = this.rel.split(",");
	    zoomto(latlng[0],latlng[1]);
	    return false;
	});

	jQuery("input:radio[name=overlay]").val(["none"]);
	jQuery("input:radio[name=overlay]").click(function() {
	    jQuery("select#forecasts").val('');
	    if ( forecast === MapserverLayer )
	    {
		map.overlayMapTypes.pop();
		forecast=undefined;
	    }
	    if ( forecast !== undefined )
	    {
		forecast.setMap(null);
		forecast=undefined;
	    }

            var file = jQuery("input:radio[name=overlay]:checked").val();
            if ( file !== "none")
            {
		if ( file === "mapserver" ) {
                    map.overlayMapTypes.push(MapserverLayer);
                    forecast = MapserverLayer;
		} else if ( file === "gdacs" ) {
		    forecast = new google.maps.KmlLayer('http://gdacs.org/xml/gdacs.kml', {suppressInfoWindows: false, preserveViewport: true});
                    forecast.setMap(map);
		} else {
		    forecast = new google.maps.KmlLayer(kmz+file, {suppressInfoWindows: true, preserveViewport: true});
		    forecast.setMap(map);
		}
            }
	});
    }

jQuery(document).ready( function() {
    /* Initialize the jQuery popup dialogs */
    jQuery('#viewer_alert').dialog({ autoOpen: false, modal: true });
    jQuery('#viewer_prompt').dialog({ autoOpen: false, modal: true });

    /* Set the map viewport */
    if ( /WebKit/i.test(navigator.userAgent) )
    {
	var el = document.createElement("style");
	el.type = "text/css";
	el.media = "screen, projection";
	document.getElementsByTagName("head")[0].appendChild(el);
	el.appendChild(document.createTextNode("_safari {}"));
    }

    myResize();


    map = new google.maps.Map(document.getElementById("viewer_map"));
    drawingManager = new google.maps.drawing.DrawingManager({
	map: map,
	drawingMode: null,
	drawingControl: false,
	polygonOptions: {
	    clickable: true,
            strokeColor: 'black',
            strokeWeight: 3,
            strokeOpacity: 0.25,
	    fillColor: 'blue',
	    fillOpacity: 0.40
	}
    });
    geocoder = new google.maps.Geocoder();
    infowindow = new google.maps.InfoWindow();

    map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
    map.setCenter(new google.maps.LatLng(38,-120));
    map.setZoom(6);

    map.setOptions({
	disableDefaultUI: true,
	panControl: true,
	panControlOptions: {
	    position: google.maps.ControlPosition.RIGHT_TOP
	},
	zoomControl: true,
	zoomControlOptions: {
	    position: google.maps.ControlPosition.RIGHT_TOP, 
	    style: google.maps.ZoomControlStyle.LARGE
	}
    });

    jQuery.getJSON('http://api.ipinfodb.com/v3/ip-city/?callback=?', {
        key:'eb6b91ebc938cbd840d53daf396ee1d94f1ff497cd72ec6dbcad87d042ee2b78',
        format:'json'}, function(data) {
            if ( (data.latitude !== 0) && (data.longitude !== 0) )
            {
		map.setCenter(new google.maps.LatLng(data.latitude, data.longitude));
		map.setZoom(6);
            }
	});


    /* Change map type to get higher zoom levels for street search */
    google.maps.event.addListener(map, "zoom_changed", function() {
	if ( ! jQuery('#maptype').is(':checked') )
	{
	    if ( map.getZoom > 15 )
	    {
		map.setMapTypeId(google.maps.MapTypeId.HYBRID);
	    }
	    else
	    {
		map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
	    }
	}
    });

    /* Add search capability */
    jQuery('#searchstring').val('');
    jQuery('#searchstring').keypress(function(e){
	if (e.which === 13)
	{
	    jQuery('#searchsubmit').click();
	    return false;
	}
    });
    jQuery('#searchsubmit').click(function(){
	geocode(jQuery('#searchstring').val());
	return false;
    });
    
    /* Add Layers */
    addLayers();

    /* Add EQ forecast maps */
    addQuakeForecasts();

    /* Add Tools */
    addQuakeTools();
    addShakingTools();
    addMiscTools();
    calcPGA();

    /* Load Portfolio */
    loadLocations();

    if ( uid > 0 )
    {
	loadPortfolio();
    }

    jQuery('a.viewer-eq').click( function() {
	var latlng = this.rel.split(",");
	zoomto(latlng[0],latlng[1]);
	return false;
    });
  
});

    /* Attach 'myResize()' to the window resize event */
    jQuery(window).bind('resize', myResize);
}
