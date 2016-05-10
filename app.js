var model;

function AppModel(canvas) {
	var self = this;
	
	var gl;
	
	var stats = new Stats();
	self.statsElement = ko.observable();
	self.statsElement.subscribe(function(e) {
		e.appendChild(stats.domElement);
	});
	stats.setMode(1);

	
	self.placementDistance = ko.observable(0.15);
	self.isWiggleLines = ko.observable(false);
	self.isRenderWireFrame = ko.observable(false);
	self.numberOfLines = ko.observable(0);
	self.numberOfElements = ko.observable(0);
	self.camera = new PCam(canvas.width, canvas.height);
	self.linesRenderer;
	
	self.wiggleLines = function() {
		var lines = self.linesRenderer.getLines();
		var line, point;
		for (var i = 0; i < lines.length; i++) {
			line = lines[i];
			for (var p = 0; p < line.length; p++) {
				point = line[p];
				point[0] += (Math.random() - 0.5) * 0.01;
				point[1] += (Math.random() - 0.5) * 0.01;
			}
		}
	};
	
	self.clearLines = function() {
		self.numberOfLines(0);
		self.numberOfElements(0);
		self.linesRenderer.clearLines();
	};
	
	var initGL = function() {
		twgl.setAttributePrefix("a_");
		gl = twgl.getWebGLContext(canvas, {
			antialias:false,
			premultipliedAlpha: false,
			alpha: false
		});
		
		// if the browser has no gl this will all fail and die. 
		// A more sopisticated program should handle this more gracefully
		gl.clearColor(0,0,0,0);
		gl.blendEquation(gl.FUNC_ADD);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
		
		// notify WebGL that OES_standard_derivatives will be used in shaders
		// required for the wireframe rendering
		gl.getExtension("OES_standard_derivatives");
	};
	
	self.init = function() {
		initGL();
		self.linesRenderer = new LinesRenderer(gl, self.camera);
		self.isRenderWireFrame.subscribe(self.linesRenderer.setRenderWireframe.bind(self.linesRenderer));
	};
	
	var adoptResolutionChanges = function() {
		twgl.resizeCanvasToDisplaySize(gl.canvas);
		self.camera.setScreenSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	};
	
	self.tick = function() {
		stats.begin();
		adoptResolutionChanges();
		gl.clear(gl.COLOR_BUFFER_BIT);
		if (self.isWiggleLines()) {
			self.wiggleLines();
		}
		self.linesRenderer.rebuildVertexBuffer();
		self.linesRenderer.render(0.42, [0.9,0.1,0.1]);
		stats.end();
	};
	
	var getWorldPositionFromEvent = function(event) {
		return self.camera.getWorldCoordinates(event.offsetX, event.offsetY);
	};
	
	var mouseDown = ko.observable(false);
	var lastPlacePosition = ko.observable(vec2.create());
	var currentMousePosition = ko.observable(vec2.create());
	var currentLineInConstruction = ko.observable([]);
	
	ko.computed(function() {
		if (mouseDown()) {
			var currentMouse = currentMousePosition();
			var distance = vec2.distance(lastPlacePosition(), currentMouse);
			if (distance >= self.placementDistance()) {
				self.numberOfElements(self.numberOfElements() + 1);
				currentLineInConstruction().push(currentMouse);
				lastPlacePosition(currentMouse);
			}
		}
	}).extend({ rateLimit: 10 });
	
	self.mouseDown = function(m, event) {
		mouseDown(true);
		var newLine = [];
		self.numberOfLines(self.numberOfLines() + 1);
		currentLineInConstruction(newLine);
		self.linesRenderer.addLine(newLine);
		currentMousePosition(getWorldPositionFromEvent(event));
	};
	
	self.mouseMove = function(e, event) {
		currentMousePosition(getWorldPositionFromEvent(event));
	};
	
	self.mouseUp = function(e, event) {
		mouseDown(false);
		currentMousePosition(getWorldPositionFromEvent(event));
	};
};

document.addEventListener("DOMContentLoaded", function(event) { 
	var getCanvas = function(id) {
		var canvas = document.getElementById(id);
		canvas.width = canvas.clientWidth;
		canvas.height = canvas.clientHeight;
		return canvas;
	};
	
	model = new AppModel(getCanvas('the-canvas'));
	
	model.init();
	
	ko.applyBindings(model);
	
	var loop = function() {
		model.tick();
		requestAnimationFrame(loop);
	};
	loop();
	
});