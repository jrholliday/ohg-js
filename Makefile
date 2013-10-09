all:
	@/usr/bin/js jslint tooltip-src.js
	@/usr/bin/js jslint order-src.js
	@/usr/bin/js jslint response-src.js
	@/usr/bin/js jslint viewer-src.js
	@/usr/bin/js jslint homeform-src.js
	@/usr/bin/js jslint forecast-src.js
	@/usr/bin/js jslint basic-src.js
	@/usr/bin/js jslint social-src.js
	@/usr/bin/js jslint megacities-src.js

	@cat globals-src.js     \
             order-src.js       \
             response-src.js    \
             tooltip-src.js     \
             viewer-src.js      \
             homeform-src.js    \
             forecast-src.js    \
             basic-src.js       \
             social-src.js      \
             megacities-src.js  >  oh_tools-src.js
	@/usr/bin/js jspacker oh_tools-src.js ../oh_tools.js
	@cat monthpicker.min.js >> ../oh_tools.js


quick:
	@cat globals-src.js     \
             order-src.js       \
             response-src.js    \
             tooltip-src.js     \
             viewer-src.js      \
             homeform-src.js    \
             forecast-src.js    \
             basic-src.js       \
             social-src.js      \
             megacities-src.js  \
             monthpicker.min.js >  ../oh_tools.js
