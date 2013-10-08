/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true */
/*global jQuery google window ajax */

function init_homeform(uid) {
    /* Variable Declaration */
    var geocoder = new google.maps.ClientGeocoder();

    /* Initialize the jQuery popup dialogs */
    jQuery('#form-warning').dialog({ autoOpen: false, modal: true });
    jQuery('#form-alert').dialog({ autoOpen: false, modal: true });

    /* Load saved values */
    function loadHome() {
	jQuery.getJSON(ajax+"/homedata?c=?", {uid:uid}, function(data) {
	    jQuery("#Field01_1").val(data.adr);
	    jQuery("#Field01_2").val(data.lat);
	    jQuery("#Field01_3").val(data.lng);
	    jQuery("#Field01_4").val(data.zid);
	    jQuery("input[name='Field02']")[data.ht - 1].checked = true;
	    jQuery("#Field03_1").val(data.yrb);
	    jQuery("#Field04_1").val(data.fls);
	    jQuery("input[name='Field05']")[data.nfl - 1].checked = true;
	    jQuery("input[name='Field06']")[data.ct  - 1].checked = true;
	    jQuery("input[name='Field07']")[data.st  - 1].checked = true;
	});
    }

    /* Store submitted values */
    function saveHome() {
	var params = {};

	params.uid = uid;
	params.adr = jQuery("#Field01_1").val();
	params.lat = jQuery("#Field01_2").val();
	params.lng = jQuery("#Field01_3").val();
	params.zid = jQuery("#Field01_4").val();
	params.ht  = jQuery("input[name='Field02']:checked").val();
	params.yrb = jQuery("#Field03_1").val();
	params.fls = jQuery("#Field04_1").val();
	params.nfl = jQuery("input[name='Field05']:checked").val();
	params.ct  = jQuery("input[name='Field06']:checked").val();
	params.st  = jQuery("input[name='Field07']:checked").val();

	// Send the data
	jQuery.getJSON(ajax+"/homedata?c=?", params, function(data) {
	    window.scrollTo(0,0);
	    jQuery('#form-alert').dialog('open');
	});
    }

    /* Check and GeoCode the Address */
    function checkAddress() {
	geocoder.getLocations(jQuery("#Field01_1").val(), function(response) {
            if ( response && response.Status.code === 200)
            {
		var loc = response.Placemark[0];

		jQuery("#Field01_1").val( loc.address.substr(0,loc.address.lastIndexOf(',')) );
		jQuery("#Field01_2").val( loc.Point.coordinates[1] );
		jQuery("#Field01_3").val( loc.Point.coordinates[0] );

		// Get the ZPID and basic home info
		jQuery.getJSON(ajax+"/zillow.php?c=?", {loc:jQuery("#Field01_1").val()}, function(data){
		    jQuery("#Field01_4").val( data.zpid );
		});
            }
	});
	return false;
    }

    /* Validate the form fields */
    function checkFields() {
	var value;

	/* Check the home address */
	value = jQuery("#Field01_1").val();
	if ( value === '' )
	{
            return false;
	}

	/* Check the Home Type */
	value = jQuery("input[name='Field02']:checked").val();
	if ( value === undefined )
	{
            return false;
	}

	/* Check the year of construction */
	value = parseInt( jQuery("#Field03_1").val() , 10 );
	if ( isNaN(value) || value < 1000 || value > 2010 )
	{
            jQuery("#Field03_1").val('');
            return false;
	}
	jQuery("#Field03_1").val( value );

	/* Check the square footage */
	value = parseInt( jQuery("#Field04_1").val() , 10 );
	if ( isNaN(value) || value <= 0 )
	{
            jQuery("#Field04_1").val('');
            return false;
	}
	jQuery("#Field04_1").val( value );

	/* Check the number of floors */
	value = jQuery("input[name='Field05']:checked").val();
	if ( value === undefined )
	{
            return false;
	}

	/* Check the Construction Type */
	value = jQuery("input[name='Field06']:checked").val();
	if ( value === undefined )
	{
            return false;
	}

	/* Check the Soil Type */
	value = jQuery("input[name='Field07']:checked").val();
	if ( value === undefined )
	{
            return false;
	}

	return true;
    }

    jQuery("#Field01_1").change(checkAddress);

    jQuery("#home_tool").submit( function() {
	if ( checkFields() === false )
	{
            jQuery('#form-warning').dialog('open');
	}
	else
	{
	    saveHome();
	}
	return false;
    });

    loadHome();
}
