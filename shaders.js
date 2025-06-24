export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform vec2 uOffset;
  uniform vec2 uResolution;
  uniform vec4 uBorderColor;
  uniform vec4 uHoverColor;
  uniform vec4 uBackgroundColor;
  uniform vec4 uYellowBorderColor;
  uniform vec2 uMousePos;
  uniform float uZoom;
  uniform float uCellSize;
  uniform float uTextureCount;
  uniform float uBorderRadius;
  uniform sampler2D uImageAtlas;
  uniform sampler2D uTextAtlas;
  uniform sampler2D uSizeTexture;
  uniform float uScalingImageIndex;
  uniform float uScalingProgress;
  uniform float uFlipProgress;
  varying vec2 vUv;
  
  // Hash function for generating pseudo-random values
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  void main() {
    vec2 screenUV = (vUv - 0.5) * 2.0;
    
    float radius = length(screenUV);
    float distortion = 1.0 - 0.08 * radius * radius;
    vec2 distortedUV = screenUV * distortion;
    
    vec2 aspectRatio = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 worldCoord = distortedUV * aspectRatio;
    
    worldCoord *= uZoom;
    worldCoord += uOffset;
    
    vec2 cellPos = worldCoord / uCellSize;
    vec2 cellId = floor(cellPos);
    vec2 cellUV = fract(cellPos);
    
    vec2 mouseScreenUV = (uMousePos / uResolution) * 2.0 - 1.0;
    mouseScreenUV.y = -mouseScreenUV.y;
    
    float mouseRadius = length(mouseScreenUV);
    float mouseDistortion = 1.0 - 0.08 * mouseRadius * mouseRadius;
    vec2 mouseDistortedUV = mouseScreenUV * mouseDistortion;
    vec2 mouseWorldCoord = mouseDistortedUV * aspectRatio;
    
    mouseWorldCoord *= uZoom;
    mouseWorldCoord += uOffset;
    
    vec2 mouseCellPos = mouseWorldCoord / uCellSize;
    vec2 mouseCellId = floor(mouseCellPos);
    
    vec2 cellCenter = cellId + 0.5;
    vec2 mouseCellCenter = mouseCellId + 0.5;
    float cellDistance = length(cellCenter - mouseCellCenter);
    float hoverIntensity = 1.0 - smoothstep(0.4, 0.7, cellDistance);
    bool isHovered = hoverIntensity > 0.0 && uMousePos.x >= 0.0;
    
    vec3 backgroundColor = uBackgroundColor.rgb;
    if (isHovered) {
      backgroundColor = mix(uBackgroundColor.rgb, uHoverColor.rgb, hoverIntensity * uHoverColor.a);
    }
    
    float lineWidth = 0.005;
    float gridX = smoothstep(0.0, lineWidth, cellUV.x) * smoothstep(0.0, lineWidth, 1.0 - cellUV.x);
    float gridY = smoothstep(0.0, lineWidth, cellUV.y) * smoothstep(0.0, lineWidth, 1.0 - cellUV.y);
    float gridMask = gridX * gridY;
    
    // Get the project index for this cell
    float texIndex = mod(cellId.x + cellId.y * 3.0, uTextureCount);
    
    // Read the size from the size texture
    vec2 sizeUV = vec2(mod(texIndex, 512.0), floor(texIndex / 512.0)) / 512.0;
    float projectSize = texture2D(uSizeTexture, sizeUV).r;
    
    // Use the project size to scale the image
    float imageSize = 0.85 * projectSize;
    float imageBorder = (1.0 - imageSize) * 0.5;
    
    vec2 imageUV = (cellUV - imageBorder) / imageSize;
    
    // Create rounded corners for the image
    float edgeSmooth = 0.01;
    vec2 imageMask = smoothstep(-edgeSmooth, edgeSmooth, imageUV) * 
                    smoothstep(-edgeSmooth, edgeSmooth, 1.0 - imageUV);
    
    // Apply rounded corners
    vec2 cornerUV = abs(imageUV - 0.5) * 2.0; // Convert to 0-1 range from center
    float cornerRadius = uBorderRadius;
    float cornerMask = 1.0 - smoothstep(cornerRadius - edgeSmooth, cornerRadius + edgeSmooth, 
                                       length(max(cornerUV - (1.0 - cornerRadius), 0.0)));
    
    float imageAlpha = imageMask.x * imageMask.y * cornerMask;
    
    // Check if this is the scaling image
    bool isScalingImage = abs(texIndex - uScalingImageIndex) < 0.1;
    
    if (isScalingImage && uScalingProgress > 0.0) {
      // Apply scaling effect - scale up the image when clicked
      float scaleFactor = 1.0 + uScalingProgress * 0.2; // Scale up to 1.2x (reduced from 1.4x)
      
      // Scale the image size
      imageSize *= scaleFactor;
      imageBorder = (1.0 - imageSize) * 0.5;
      
      // Recalculate image UV with new size
      imageUV = (cellUV - imageBorder) / imageSize;
      
      // Recalculate image mask and alpha for scaled size
      imageMask = smoothstep(-edgeSmooth, edgeSmooth, imageUV) * 
                 smoothstep(-edgeSmooth, edgeSmooth, 1.0 - imageUV);
      cornerUV = abs(imageUV - 0.5) * 2.0;
      cornerMask = 1.0 - smoothstep(cornerRadius - edgeSmooth, cornerRadius + edgeSmooth, 
                                   length(max(cornerUV - (1.0 - cornerRadius), 0.0)));
      imageAlpha = imageMask.x * imageMask.y * cornerMask;
    } else if (!isScalingImage && uFlipProgress > 0.0) {
      // Apply flip effect to other images
      float flipScale = 1.0 - uFlipProgress * 0.15; // Shrink even less (reduced from 0.3)
      float flipAlpha = 1.0 - uFlipProgress * 0.3; // Fade even less (reduced from 0.6)
      
      // Scale down the image
      imageSize *= flipScale;
      imageBorder = (1.0 - imageSize) * 0.5;
      
      // Use scaled coordinates
      imageUV = (cellUV - imageBorder) / imageSize;
      
      // Recalculate masks
      imageMask = smoothstep(-edgeSmooth, edgeSmooth, imageUV) * 
                 smoothstep(-edgeSmooth, edgeSmooth, 1.0 - imageUV);
      cornerUV = abs(imageUV - 0.5) * 2.0;
      cornerMask = 1.0 - smoothstep(cornerRadius - edgeSmooth, cornerRadius + edgeSmooth, 
                                   length(max(cornerUV - (1.0 - cornerRadius), 0.0)));
      imageAlpha = imageMask.x * imageMask.y * cornerMask * flipAlpha;
    }
    
    bool inImageArea = imageUV.x >= 0.0 && imageUV.x <= 1.0 && imageUV.y >= 0.0 && imageUV.y <= 1.0;
    
    vec3 color = backgroundColor;
    
    if (inImageArea && imageAlpha > 0.0) {
      float atlasSize = ceil(sqrt(uTextureCount));
      vec2 atlasPos = vec2(mod(texIndex, atlasSize), floor(texIndex / atlasSize));
      vec2 atlasUV = (atlasPos + imageUV) / atlasSize;
      atlasUV.y = 1.0 - atlasUV.y;
      
      vec3 imageColor = texture2D(uImageAtlas, atlasUV).rgb;
      color = mix(color, imageColor, imageAlpha);
    }
    
    // Create yellow border around the image when clicked
    if (isScalingImage && uScalingProgress > 0.0) {
      float borderWidth = 0.012; // Further reduced border thickness
      
      // Create border mask - ensure it fits within cell bounds
      vec2 borderUV = (cellUV - imageBorder + borderWidth * 0.3) / (imageSize + borderWidth * 0.6);
      vec2 borderMask = smoothstep(-edgeSmooth, edgeSmooth, borderUV) * 
                       smoothstep(-edgeSmooth, edgeSmooth, 1.0 - borderUV);
      
      // Apply rounded corners to border with same radius as image
      vec2 borderCornerUV = abs(borderUV - 0.5) * 2.0;
      float borderCornerMask = 1.0 - smoothstep(cornerRadius - edgeSmooth, cornerRadius + edgeSmooth, 
                                               length(max(borderCornerUV - (1.0 - cornerRadius), 0.0)));
      
      float borderAlpha = borderMask.x * borderMask.y * borderCornerMask;
      
      // Only show border where image is not (border minus image)
      float finalBorderAlpha = borderAlpha * (1.0 - imageAlpha);
      
      // Ensure border doesn't extend beyond cell boundaries with more tolerance
      finalBorderAlpha *= smoothstep(0.0, 0.02, cellUV.x) * smoothstep(0.0, 0.02, 1.0 - cellUV.x) *
                         smoothstep(0.0, 0.02, cellUV.y) * smoothstep(0.0, 0.02, 1.0 - cellUV.y);
      
      color = mix(color, uYellowBorderColor.rgb, finalBorderAlpha * uYellowBorderColor.a);
    }
    
    // Regular cell grid border - only show if not the scaling image
    if (!isScalingImage || uScalingProgress <= 0.0) {
      vec3 borderRGB = uBorderColor.rgb;
      float borderAlpha = uBorderColor.a;
      color = mix(color, borderRGB, (1.0 - gridMask) * borderAlpha);
    }
    
    float fade = 1.0 - smoothstep(1.2, 1.8, radius);
    
    gl_FragColor = vec4(color * fade, 1.0);
  }
`;
