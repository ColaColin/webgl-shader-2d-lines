precision mediump float;

varying vec3 barycentric;

varying vec2 v_dA0;
varying vec2 v_dA1;
varying vec2 v_dB0;
varying vec2 v_dB1;

varying vec2 v_world_location;
varying float v_index;

uniform vec3 color;
uniform bool renderWireframe;
uniform float thickness;

// see http://codeflow.org/entries/2012/aug/02/easy-wireframe-display-with-barycentric-coordinates/
#extension GL_OES_standard_derivatives : enable
float edgeFactor(){
	vec3 d = fwidth(barycentric);
	vec3 a3 = smoothstep(vec3(0.0), d*1.5, barycentric);
	return min(min(a3.x, a3.y), a3.z);
}

float distanceFactorPointToSegment() {
	// find the start and end of the segment that this fragment is part of
	// and return a factor that is between 0 and 1 for fragments that are part of the line
	// with a round joint
	vec2 start;
	vec2 end;
	
	if (mod(floor(v_index), 2.0) == 0.0) {
		start = v_dA0;
		end = v_dA1;
	} else {
		start = v_dB0;
		end = v_dB1;
	}

	vec2 diff = end - start;
	float length2 = diff.x * diff.x + diff.y * diff.y;
	vec2 nearestPoint = vec2(0);
	if (length2 == 0.0) {
		nearestPoint = v_world_location;
	} else {
		float t = ((v_world_location.x - start.x) * diff.x + (v_world_location.y - start.y) * diff.y) / length2;
		if (t < 0.0) {
			nearestPoint = start;
		} else if (t > 1.0) {
			nearestPoint = end;
		} else {
			nearestPoint = vec2(start.x + t * (end.x - start.x), start.y + t * (end.y - start.y));
		}
	}
	
	float distanceToLine = distance(nearestPoint, v_world_location);
	return distanceToLine / (thickness/2.0);
}

float getRoundEdgeLineAlpha() {
	float dFactor = distanceFactorPointToSegment();
	float alpha = smoothstep(1.0, 0.85, dFactor);
	return alpha;
}

void main() {
	float roundEdgeAlpha = getRoundEdgeLineAlpha();
	float meshEdgeAlpha = renderWireframe ? ((1.0-edgeFactor())*0.95) : 0.0;
	vec3 finalColor = vec3(1) * meshEdgeAlpha + color * (1.0 - meshEdgeAlpha);
	gl_FragColor = vec4(finalColor, max(meshEdgeAlpha, roundEdgeAlpha));
}