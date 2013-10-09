/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:false, newcap:true, immed:true */
/*global jQuery window google alert ajax */

// edit-attributes-1 : Address
// edit-attributes-6 : Property Value
// edit-attributes-4 : Home Type
// edit-attributes-8 : Year of Construction
// edit-attributes-7 : Square Footage
// edit-attributes-5 : Number of Floors/Levels
// edit-attributes-2 : Construction Type
// edit-attributes-3 : Ground Type

function init_order_defaults()
{
     /* Variable Declaration */
     var geocoder = new google.maps.Geocoder();

     jQuery('#edit-attributes-1').val('');
     jQuery('#edit-attributes-6').val('$500,000');
     jQuery('#edit-attributes-4').get(0).selected = true;
     jQuery('#edit-attributes-8').val('1980');
     jQuery('#edit-attributes-7').val('1,500 sqft');
     jQuery('#edit-attributes-5').get(0).selected = true;
     jQuery('#edit-attributes-2').get(0).selected = true;
     jQuery('#edit-attributes-3').get(0).selected = true;

    function num_strip(nStr) { return nStr.replace(/[^\d\.]/g, ''); }
    function num_format(nStr)
    {
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
	var value, built, size;

	value = num_strip( jQuery('#edit-attributes-6').val() );
	if ( value === "" ) { value = 500000; }
	jQuery('#edit-attributes-6').val( '$' + num_format(value) );

	built = parseInt(jQuery('#edit-attributes-8').val(), 10);
	built = ( built > 0 ? built : 1980 );
	jQuery('#edit-attributes-8').val(built);

	size = parseInt(num_strip(jQuery('#edit-attributes-7').val()), 10);
	size = ( size > 0 ? size : 1500 );
	jQuery('#edit-attributes-7').val( num_format(size) + ' sqft');
    }

    // Add search functionality
    jQuery('#edit-attributes-1').change( function() {

        geocoder.geocode({address: jQuery('#edit-attributes-1').val()}, function(results, status) {
	    /* Variable Declaration */
	    var loc;

            if (status !== google.maps.GeocoderStatus.OK) {
		//alert("Status Code:" + response.Status.code);
            }
            else
            {
                loc = results[0].formatted_address;
		loc = loc.substr(0,loc.lastIndexOf(','));
		jQuery('#edit-attributes-1').val(loc);

		// Get the ZPID and basic home info
		jQuery.getJSON(ajax+"/zillow.php?c=?", {loc:loc}, function(data){
		    /* Variable Declaration */
		    var zpid, value, yearBuilt, lotSizeSqFt, finishedSqFt;

		    // ZPID
		    zpid = data.zpid;

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
			    if ( parseInt(numFloorsE,10) >= 4 ) { numFloorsE = '4'; }

			    // Return Results
			    jQuery('#edit-attributes-6').val(value);
			    jQuery('#edit-attributes-8').val(yearBuiltE);
			    jQuery('#edit-attributes-7').val(finishedSqFtE);
			    jQuery('#edit-attributes-5').val(numFloorsE);

			    validateFields();
			});
		    }
		});

            }
	});
	return false;
    });
}

jQuery(document).ready(function() {
    if ( jQuery('#edit-attributes-1').length > 0 ) { init_order_defaults(); }
});


jQuery(document).ready( function() {
    var show_vote_block = false;
    jQuery('#block-advpoll-latest_poll').find(':submit').each(function() {
        if ( jQuery(this).val() === 'Vote' ) { show_vote_block = true; }
      });

    if ( show_vote_block === false )
      {
        jQuery('#block-advpoll-latest_poll').parents('.block-wrapper').hide();
      }
  });
