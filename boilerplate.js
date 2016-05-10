// This file contains all sorts of helper code that I need to do what I want to do ;)

// A 2d camera that can handle scrolling and zooming
// It handles creation of the required matrices for the shaders
// In this example the input is not linked up with the camera, so it just stays still where it is initialized
function PCam(targetScreenWidth, targetScreenHeight) {
	var self = this;
	
	// translate
	var x = 0;
	var y = 0;
	
	// scale
	var visibleWorldSize = 15;
	var visibleWorldWidth = 0;
	var visibleWorldHeight = 0;
	var screenWidth = targetScreenWidth;
	var screenHeight = targetScreenHeight;
	
	var worldToNDCMatrix = mat3.create();
	var worldToPixelsMatrix = mat3.create();
	var pixlesToWorldMatrix = mat3.create();
	
	var setVisibleWorld = function() {
		if (screenWidth > screenHeight) {
			var aspect = screenHeight / screenWidth;
			visibleWorldWidth = visibleWorldSize;
			visibleWorldHeight = visibleWorldSize * aspect;
		} else {
			var aspect = screenWidth / screenHeight;
			visibleWorldHeight = visibleWorldSize;
			visibleWorldWidth = visibleWorldSize * aspect;
		}
	};
	
	var mOutdated = true;
	var updateMatrices = function() {
		setVisibleWorld();
		
		mat3.identity(worldToNDCMatrix);
		mat3.scale(worldToNDCMatrix, worldToNDCMatrix, vec2.fromValues(2/visibleWorldWidth, -2/visibleWorldHeight));
		mat3.translate(worldToNDCMatrix, worldToNDCMatrix, vec2.fromValues(-x, -y));
		
		mat3.identity(worldToPixelsMatrix);
		mat3.scale(worldToPixelsMatrix, worldToPixelsMatrix, vec2.fromValues(screenWidth/visibleWorldWidth,
				screenHeight/visibleWorldHeight));
		mat3.translate(worldToPixelsMatrix, worldToPixelsMatrix, 
				vec2.fromValues(-x + (visibleWorldWidth/2), -y + (visibleWorldHeight/2)));
		
		mat3.invert(pixlesToWorldMatrix, worldToPixelsMatrix);
	};
	
	var checkMatrices = function() {
		if (mOutdated) {
			updateMatrices();
			mOutdated = false;
		}
	};
	
	checkMatrices();
	
	self.setScreenSize = function(w, h) {
		screenWidth = w;
		screenHeight = h;
		mOutdated = true;
	};
	
	self.getScreenSize = function() {
		return [screenWidth, screenHeight];
	};
	
	self.setPosition = function(px, py) {
		x = px;
		y = py;
		mOutdated = true;
	};
	
	self.getPosition = function() {
		return [x,y];
	};
	
	self.setVisibleWorldSize = function(w) {
		visibleWorldSize = w;
		mOutdated = true;
	};
	
	self.getVisibleWorldSize = function() {
		return visibleWorldSize;
	};
	
	self.getVisibleWorld = function() {
		checkMatrices();
		return [visibleWorldWidth, visibleWorldHeight];
	};
	
	var doMTransform = function(x, y, mat) {
		var v = vec2.fromValues(x, y);
		vec2.transformMat3(v, v, mat);
		return v;
	};
	
	self.getNDC = function(wx, wy) {
		checkMatrices();
		return doMTransform(wx, wy, worldToNDCMatrix);
	};
	
	self.getWorldCoordinates = function(mx, my) {
		checkMatrices();
		return doMTransform(mx, my, pixlesToWorldMatrix);
	};
	
	self.getScreenCoordinates = function(wx, wy) {
		checkMatrices();
		return doMTransform(wx, wy, worldToPixelsMatrix);
	};
	
	self.getNDCMatrix = function() {
		checkMatrices();
		return worldToNDCMatrix;
	};
	
	self.getPixelToWorldMatrix = function() {
		checkMatrices();
		return pixlesToWorldMatrix;
	};
	
	self.getWorldToPixelsMatrix = function() {
		checkMatrices();
		return worldToPixelsMatrix;
	};
};

var syncTextFileLoad = function(path) {
	var o = new XMLHttpRequest();
	try {
		o.open('GET', path, false);
		o.send('');
	} catch (err) {
		console.log("error loading " + src);
		return;
	}
	if (o.status > 200) {
		console.log('Failed loading', src, 'Status', o.status);
		return;
	}
	return o.responseText;
};

// this uses blocking request to be simple. A more complicated, but better,
// approach is to preload shaders. For simplicity I do not do that here.
var makeShaderInfo = function(gl, vs, fs) {
	var pInf = twgl.createProgramInfo(gl,
			[syncTextFileLoad(vs),
			 syncTextFileLoad(fs)]);
	
	var program = pInf.program;
	var numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
	pInf.attribKeys = Object.create(null);
	
	for (var i = 0; i < numAttribs; i++) {
		var attribInfo = gl.getActiveAttrib(program, i);
		if (!attribInfo) {
			break;
		}
		pInf.attribKeys[attribInfo.name] = gl.getAttribLocation(program, attribInfo.name);
	}
	
	return pInf;
};

// a custom knockout binding that allows to fill observables with DOM-elements
ko.bindingHandlers.self = {
	update : function(element, valueAccessor, allBindings, viewModel, bindingContext) {
		valueAccessor()(element);
	}
};
