all:
	@./jslint tooltip-src.js
	@./jslint order-src.js
	@./jslint response-src.js
	@./jslint viewer-src.js
	@./jslint homeform-src.js
	@./jslint forecast-src.js
	@./jslint basic-src.js
	@./jslint megacities-src.js

	@cat globals-src.js     \
             order-src.js       \
             response-src.js    \
             tooltip-src.js     \
             viewer-src.js      \
             homeform-src.js    \
             forecast-src.js    \
             basic-src.js       \
             megacities-src.js  >  oh_tools-src.js
	@./jspacker oh_tools-src.js ../oh_tools.js
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
             megacities-src.js  \
             monthpicker.min.js >  ../oh_tools.js
