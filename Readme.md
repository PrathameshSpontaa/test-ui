# Phantom-Inspired Draggable Infinite Gallery

A modern, interactive image gallery built with Three.js and WebGL shaders, featuring smooth drag interactions, infinite scrolling, and a radial context menu. Inspired by the aesthetic and interaction patterns of modern design systems.

![Gallery Preview](public/img1.jpeg)

## ✨ Features

- **Infinite Draggable Gallery**: Smooth drag interactions with momentum and easing
- **WebGL-Powered Rendering**: High-performance graphics using Three.js and custom shaders
- **Dynamic Image Scaling**: Images scale and animate on interaction
- **Radial Context Menu**: Right-click to access view, edit, share, and delete actions
- **Responsive Design**: Adapts to different screen sizes and aspect ratios
- **Vignette Effect**: Subtle darkening around the edges for focus
- **Smooth Animations**: GSAP-powered transitions and micro-interactions
- **Texture Atlas Optimization**: Efficient memory usage with texture atlasing

## 🚀 Live Demo

## 🛠️ Technologies Used

- **Three.js** - 3D graphics and WebGL rendering
- **GSAP** - Animation library for smooth transitions
- **Vite** - Fast build tool and development server
- **WebGL Shaders** - Custom fragment and vertex shaders for visual effects
- **Vanilla JavaScript** - Modern ES6+ features and modules

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cg-phantom-gallery-javascript.git
   cd cg-phantom-gallery-javascript
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the gallery

## 🎮 Usage

### Basic Interactions

- **Drag**: Click and drag to navigate through the infinite gallery
- **Hover**: Hover over images to see subtle highlight effects
- **Click**: Click on images to trigger scaling animations

### Context Menu Actions

- **👁️ View**: View the full image details
- **✏️ Edit**: Edit image properties
- **📤 Share**: Share the image
- **🗑️ Delete**: Remove the image from the gallery

## 📁 Project Structure

```
cg-phantom-gallery-javascript/
├── index.html          # Main HTML file
├── script.js           # Main JavaScript application
├── shaders.js          # WebGL shader definitions
├── data.js             # Gallery data and image metadata
├── styles.css          # CSS styles and animations
├── package.json        # Project dependencies and scripts
├── public/             # Static assets
│   ├── img1.jpeg       # Gallery images
│   ├── img2.jpeg
│   └── ...
└── README.md           # This file
```

## 🔧 Configuration

### Gallery Settings

The gallery behavior can be customized in `script.js`:

```javascript
const config = {
  cellSize: 0.3,                    // Size of each gallery cell
  zoomLevel: 1.25,                  // Initial zoom level
  lerpFactor: 0.075,                // Smoothing factor for animations
  borderColor: "rgba(255, 255, 255, 0)", // Cell border color
  backgroundColor: "rgba(0, 0, 0, 1)",   // Background color
  textColor: "rgba(128, 128, 128, 1)",   // Text color
  hoverColor: "rgba(255, 255, 255, 0)",  // Hover effect color
  borderRadius: 1,                  // Border radius for images
  yellowBorderColor: "rgba(255, 255, 0, 1)" // Selection border color
};
```

### Adding Images

To add new images to the gallery, update the `projects` array in `data.js`:

```javascript
export const projects = [
  {
    title: "Your Image Title",
    image: "/path/to/your/image.jpeg",
    year: 2024,
    href: "/project-link",
    size: 1.2, // Relative size (0.6 - 1.5 recommended)
  },
  // ... more projects
];
```

## 🎨 Customization

### Styling

The visual appearance can be customized through:

- **CSS Variables**: Modify colors, spacing, and typography in `styles.css`
- **Shader Parameters**: Adjust visual effects in `shaders.js`
- **Animation Timing**: Change animation durations in `script.js`

### Shader Effects

The project uses custom WebGL shaders for:

- **Distortion Effects**: Subtle screen distortion for depth
- **Vignette**: Darkening around the edges
- **Image Scaling**: Smooth scaling animations
- **Border Effects**: Dynamic borders and highlights

## 🚀 Performance Optimization

- **Texture Atlasing**: Multiple images combined into single textures
- **Efficient Rendering**: WebGL-based rendering for smooth 60fps performance
- **Lazy Loading**: Images loaded on-demand
- **Memory Management**: Proper cleanup of WebGL resources

## 🌐 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Inspired by modern design systems and interaction patterns
- Built with Three.js for powerful 3D graphics
- Uses GSAP for smooth animations
- Texture atlasing techniques for performance optimization

## 📞 Support

If you have any questions or need help with the project, please:

- Open an issue on GitHub
- Check the documentation
- Review the code comments for implementation details

---

**Made with ❤️ using Three.js and WebGL**
