/*jslint white:false, onevar:true, browser:true, undef:true, nomen:true, eqeqeq:true, plusplus:true, bitwise:true, regexp:true, newcap:true, immed:true */
/*global jQuery */

jQuery(document).ready(function() {
    /* Variable Declaration */
    var xOffset, yOffset;

    /* CONFIG */
    xOffset = 25;
    yOffset = 20;
    /* END CONFIG */

    jQuery(".tooltip").css("cursor","help");

    jQuery(".tooltip").hover(function(e) {  
	this.t = this.title;
	this.title = "";
	jQuery("body").append("<p id='tooltip'>"+ this.t +"</p>");
	jQuery("#tooltip")
	    .css("top",(e.pageY - yOffset) + "px")
	    .css("left",(e.pageX + xOffset) + "px")
	    .fadeIn("fast");
    },
			 function(){
			     this.title = this.t;
			     jQuery("#tooltip").remove();
			 });
    jQuery(".tooltip").mousemove(function(e){
	jQuery("#tooltip")
	    .css("top",(e.pageY - yOffset) + "px")
	    .css("left",(e.pageX + xOffset) + "px");
    });
});
