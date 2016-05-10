// A LinesRenderer renders an arbitrary number of dynamic lines 
// that share a thickness and color
function LinesRenderer(gl, camera) {
	var self = this;
	
	// internally the buffer with the vertex data is initialized to this size 
	// and grown in x2 steps whenever it is not large enough anymore
	var DEFAULT_BUFFER_SIZE = 2048;
	
	// the number of floats in a single vertex
	// a single vertex contains:
	// x-coordinate
	// y-coordinate
	// index-counter (0,1,2,3,4...)
	// they are packed together as a single vec3 attribute
	var VERTEX_SIZE = 3;
	
	var lineShaderProgramInfo = makeShaderInfo(gl, "shaders/line.vs", "shaders/line.fs");
	
	var renderWireframe = false;
	
	// an array of an array of vec2 objects, describing a list of lines
	var lines = [];
	
	// the buffer that will be provided to the vertex shader. Updated in every step
	// only one buffer is used that is filled with degenrate triangles between the lines
	var vertexBuffer = gl.createBuffer();
	var vertexBufferData = new Float32Array(DEFAULT_BUFFER_SIZE);
	// the buffer may only be partly be filled
	var vertexBufferContentLength = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	
	// helper method to bind the vertex buffer and its attributes
	var bindBufferAndAttributes = function() {
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		
		var bytesPerVertex = VERTEX_SIZE * 4;
		
		var prevIndex = lineShaderProgramInfo.attribKeys["a_prev_pack"];
		gl.enableVertexAttribArray(prevIndex);
		// vertex index, number of components in the vertex, data type, normalized, stride in bytes, offset in bytes
		gl.vertexAttribPointer(prevIndex, 3, gl.FLOAT, false, bytesPerVertex, 0);

		var currentIndex = lineShaderProgramInfo.attribKeys["a_current_pack"];
		gl.enableVertexAttribArray(currentIndex);
		gl.vertexAttribPointer(currentIndex, 3, gl.FLOAT, false, bytesPerVertex, 2 * bytesPerVertex);
		
		var nextIndex = lineShaderProgramInfo.attribKeys["a_next_pack"];
		gl.enableVertexAttribArray(nextIndex);
		gl.vertexAttribPointer(nextIndex, 3, gl.FLOAT, false, bytesPerVertex, 4 * bytesPerVertex);
	};
	
	// and the counter part to clean up
	var unbindBufferAndAttributes= function() {
		gl.disableVertexAttribArray(lineShaderProgramInfo.attribKeys["a_prev_pack"]);
		gl.disableVertexAttribArray(lineShaderProgramInfo.attribKeys["a_current_pack"]);
		gl.disableVertexAttribArray(lineShaderProgramInfo.attribKeys["a_next_pack"]);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	// find the number of vertices that has to be drawn for the vertex buffer
	var elementsNumForBuffer = function() {
		// - 4 for the two start and the two close vertices 
		return (vertexBufferContentLength / VERTEX_SIZE) - 4;
	};
	
	// makes sure the Float32Array that is used as a source for the WebGL buffer can 
	// hold all information it needs to hold
	var setBufferContentLength = function(targetSize) {
		var newLength = vertexBufferData.length;
		if (newLength < targetSize) {
			while(newLength < targetSize) {
				newLength *= 2;
			}
			var old = vertexBufferData;
			vertexBufferData = new Float32Array(newLength);
			for (var i = 0; i < vertexBufferContentLength; i++) {
				vertexBufferData[i] = old[i];
			}
		}
		vertexBufferContentLength = targetSize;
	};
	
	// adds a single vertex to the Float32Array that is used as a buffer for WebGL
	// this function also takes care of keeping track of how many data is in the buffer
	var appendPoint = function(x, y, index) {
		var b = vertexBufferContentLength;
		setBufferContentLength(vertexBufferContentLength + VERTEX_SIZE);
		vertexBufferData[b] = x;
		vertexBufferData[b + 1] = y;
		vertexBufferData[b + 2] = index;
	};
	
	self.addLine = function(pointsArray) {
		lines.push(pointsArray);
	};
	
	self.clearLines = function() {
		lines = [];
	};
	
	self.getLines = function() {
		return lines;
	};
	
	self.setRenderWireframe = function(wf) {
		renderWireframe = wf;
	};
	
	var fillVertexBuffer = function() {
		var target = vertexBufferData;
		var isAtStart = true;
		var currentLineIndex = 0;
		var workLine, workPoint, firstPoint, lastPoint, 
			needsStartDegenerate, needsEndDegenerate;

		for (var i = 0; i < lines.length; i++) {
			workLine = lines[i];
			if (workLine.length > 1) { // a line defined by a single dot isn't a line
				currentLineIndex = 0;
				firstPoint = workLine[0]; 
				
				// add a degenerate triangle point for all but the very first line
				needsStartDegenerate = i !== 0;
				if (needsStartDegenerate) {
					appendPoint(firstPoint[0], firstPoint[1], 0);
				}
				
				// startup points
				appendPoint(firstPoint[0], firstPoint[1], 0);
				appendPoint(firstPoint[0], firstPoint[1], 1);
				
				// actual points
				for (var p = 0; p < workLine.length; p++) {
					workPoint = workLine[p];
					appendPoint(workPoint[0], workPoint[1], currentLineIndex++);
					appendPoint(workPoint[0], workPoint[1], currentLineIndex++);
				}
				
				// closeup points
				lastPoint = workPoint;
				appendPoint(lastPoint[0], lastPoint[1], currentLineIndex - 2);
				appendPoint(lastPoint[0], lastPoint[1], currentLineIndex - 1);
				
				// add a degenerate triangle point for all but the very last line
				needsEndDegenerate = i !== lines.length - 1; 
				if (needsEndDegenerate) {
					appendPoint(lastPoint[0], lastPoint[1], currentLineIndex - 1);
				}
			}
		}
	}
	
	// rebuilds the vertex buffer to react to changes in the lines
	// with moving lines this is needed in every frame.
	self.rebuildVertexBuffer = function() {
		// clear out everything by resetting the size to 0
		vertexBufferContentLength = 0;
		
		if (lines.length > 0) {
			fillVertexBuffer();
		}
		
		// take a view of the relevant part of the buffer
		var subData = vertexBufferData.subarray(0, vertexBufferContentLength);
		
		// set it as the active buffer for webgl
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, subData, gl.DYNAMIC_DRAW);
	};
	
	// render all current lines with a given thickness and color
	// colorRGB is expected to be a 3 element array with normalized color values
	self.render = function(thickness, colorRGB) {
		var elementsToDraw = elementsNumForBuffer();
		if (elementsToDraw > 0) {
			gl.useProgram(lineShaderProgramInfo.program);
			
			twgl.setUniforms(lineShaderProgramInfo, {
				camMatrix: camera.getNDCMatrix(),
				thickness: thickness,
				color: colorRGB,
				renderWireframe: renderWireframe
			});
			
			bindBufferAndAttributes();
			
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, elementsToDraw);
			
			unbindBufferAndAttributes();
		}
	};
}