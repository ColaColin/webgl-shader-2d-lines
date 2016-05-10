precision mediump float;

attribute vec3 a_prev_pack;
attribute vec3 a_current_pack;
attribute vec3 a_next_pack;

varying vec3 barycentric;

varying vec2 v_dA0;
varying vec2 v_dA1;
varying vec2 v_dB0;
varying vec2 v_dB1;

varying float v_index;
varying vec2 v_world_location;

uniform float thickness;
uniform mat3 camMatrix;

void main() {
	vec2 prev = a_prev_pack.xy;
	vec2 current = a_current_pack.xy;
	vec2 next = a_next_pack.xy;
	float index = a_current_pack.z;
	
	// the index of the point that this vertex is for
	// index is the index of the vertex
	float pointIndex = floor(index / 2.0);
	v_index = pointIndex;
	
	vec2 direction;
	float length = 1.0;
	// for the very first point of a line use the segment between the first and the next  
	if (prev == current) {
		vec2 lineA = normalize(next - current);
		direction = vec2(-lineA.y, lineA.x);
		
		// explanation of these is best done in the blog post (blog.neonmade.net)
		v_dA0 = current;
		v_dA1 = next;
		v_dB0 = v_dA0;
		v_dB1 = v_dA1;
	// for the very last point of a line use the segment between the first and the next 
	} else if (next == current) {
		vec2 lineA = normalize(current - prev);
		direction = vec2(-lineA.y, lineA.x);
		
		v_dA0 = prev;
		v_dA1 = current;
		v_dB0 = v_dA0;
		v_dB1 = v_dA1;
	} else { // else use both segments and use a mither joint for the mesh
		vec2 lineA = normalize(current - prev);
		vec2 lineB = normalize(next - current);
		vec2 direct = normalize(lineA + lineB);
		direction = vec2(-direct.y, direct.x);
		float d = dot(direction, vec2(-lineA.y, lineA.x));
		if (abs(d - 0.01) > 0.0) {
			length = 1.0 / d;
		} else {
			// run around in circles, screaming ;)
			length = 1337.0;
		}
		
		if (mod(floor(pointIndex), 2.0) == 0.0) {
			v_dA0 = current;
			v_dA1 = next;
			v_dB0 = prev;
			v_dB1 = current;
		} else {
			v_dA0 = prev;
			v_dA1 = current;
			v_dB0 = current;
			v_dB1 = next;
		}
	}
	
	length *= thickness * 0.5;
	
	vec2 ap = vec2(direction * length);
	
	vec2 result = current; 
	
	if (mod(index, 2.0) == 0.0) {
		result += ap;
	} else {
		result -= ap;
	}
	
	v_world_location = result;
	
	gl_Position = vec4((camMatrix * vec3(result, 1.0)).xy, 0.0, 1.0);
	
	float m3 = mod(index, 3.0);
	if (abs(m3) < 0.01) {
		barycentric = vec3(1,0,0);
	} else if (abs(m3 - 1.0) < 0.01) {
		barycentric = vec3(0,1,0);
	} else {
		barycentric = vec3(0,0,1);
	}
}