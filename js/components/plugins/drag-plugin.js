import { StateManager } from '../../core/state-manager.js';
import * as logger from '../../utils/logger.js'; // Import the logger

/**
 * DragPlugin for BaseUIElement
 * Adds drag-and-drop functionality to an element.
 */
export const DragPlugin = {
  name: 'draggable', // Name used to identify the plugin

  /**
   * Initializes the plugin for a given element instance.
   * @param {BaseUIElement} element - The element instance this plugin is attached to.
   * @param {object} [config={}] - Plugin-specific configuration (optional).
   * @returns {object} An object containing methods/properties the plugin exposes (e.g., destroy).
   */
  init(element, config = {}) {
    console.log(`Initializing DragPlugin for element: ${element.id}`);

    // --- Plugin State ---
    let isDragging = false;
    let startX, startY; // Mouse position at drag start
    let elementStartX, elementStartY; // Element position (%) at drag start

    // --- Event Handlers ---
    const handleMouseDown = (event) => {
      // Only drag with left mouse button
      if (event.button !== 0) return; 
      
      // Check if the click target is the container or one of its direct children
      // This prevents dragging if clicking deep inside complex elements, but allows dragging the main element
      // A more robust solution might involve specific draggable handles later.
      if (event.target !== element.container && event.target.parentNode !== element.container) {
         // Allow dragging if clicking on simple child elements like clock hands/face
         // Refine this check if needed for more complex elements
         if (!event.target.classList.contains('hand') && !event.target.classList.contains('analog-face') && !event.target.classList.contains('date-face')) {
            // console.log("Drag prevented: Click target is not container or allowed child.", event.target);
            // return; 
            // Let's allow dragging from anywhere within the container for now
         }
      }
      
      event.preventDefault(); // Prevent text selection during drag
      isDragging = true;
      
      // Record starting positions
      startX = event.clientX;
      startY = event.clientY;
      
      // Get current element position from state (or default if not set)
      const currentState = StateManager.getNestedValue(StateManager.getState(), element.statePath);
      elementStartX = currentState?.position?.x ?? 50; // Default to center if no position
      elementStartY = currentState?.position?.y ?? 50;
      
      // Add class for visual feedback (optional)
      element.container.classList.add('is-dragging');
      
      // Add listeners for mouse move and up on the window
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp); // Stop drag if mouse leaves window
    };

    const handleMouseMove = (event) => {
      if (!isDragging) return;
      
      const currentX = event.clientX;
      const currentY = event.clientY;
      
      // Calculate distance moved in pixels
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      
      // Convert pixel delta to percentage delta based on viewport size
      const deltaPercentX = (deltaX / window.innerWidth) * 100;
      const deltaPercentY = (deltaY / window.innerHeight) * 100;
      
      // Calculate new percentage position
      let newX = elementStartX + deltaPercentX;
      let newY = elementStartY + deltaPercentY;
      
      // Basic boundary checking to keep element on screen
      const margin = 2; // 2% margin from edges
      newX = Math.max(margin, Math.min(100 - margin, newX));
      newY = Math.max(margin, Math.min(100 - margin, newY));
      
      // Update element style directly for smooth visual feedback during drag
      element.container.style.left = `${newX}%`;
      element.container.style.top = `${newY}%`;
      
      // Only apply transform for centering, scaling is now handled by CSS custom property
      element.container.style.transform = `translate(-50%, -50%)`;
    };

    const handleMouseUp = (event) => {
      if (!isDragging) return;
      
      isDragging = false;
      
      // Remove window listeners first
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
      
      // Update the state with final position
      const finalX = parseFloat(element.container.style.left);
      const finalY = parseFloat(element.container.style.top);
      
      // Dispatch state update only if position actually changed
      if (finalX !== elementStartX || finalY !== elementStartY) {
          // Remove dragging class after a small delay to prevent outline flash
          setTimeout(() => {
              element.container.classList.remove('is-dragging');
          }, 50);
          console.log(`Drag ended for ${element.id}. New position: (${finalX.toFixed(1)}%, ${finalY.toFixed(1)}%)`);
          // Call updateElementState via the stateBinding mixin/handler
          if (element.stateBinding && typeof element.stateBinding.updateElementState === 'function') {
              element.stateBinding.updateElementState({ position: { x: finalX, y: finalY } });
          } else {
              logger.error(`[DragPlugin] Cannot update state for ${element.id}: stateBinding or updateElementState method not found.`);
          }
      } else {
          // Remove dragging class after a small delay even if position didn't change
          setTimeout(() => {
              element.container.classList.remove('is-dragging');
          }, 50);
          console.log(`Drag ended for ${element.id} with no position change.`);
      }
    };

    // Store the bound handler so it can be removed later
    const boundMouseDownHandler = handleMouseDown.bind(this); 
    element.eventHandlers.dragMouseDown = boundMouseDownHandler; // Store for removal
    
    // Plugin API / Lifecycle
    return {
      // Called by BaseUIElement after element.container exists
      attachEventListeners: () => {
        if (element.container) {
          console.log(`DragPlugin attaching mousedown listener to ${element.id}`);
          element.container.addEventListener('mousedown', boundMouseDownHandler);
        } else {
            logger.error(`DragPlugin: Cannot attach listener, element container not found for ${element.id}`);
        }
      },
      // Called by BaseUIElement during its destroy phase
      destroy: () => {
        console.log(`Destroying DragPlugin for ${element.id}`);
        if (element.container && boundMouseDownHandler) {
          element.container.removeEventListener('mousedown', boundMouseDownHandler);
        }
        // Ensure window listeners are removed if drag was interrupted
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mouseleave', handleMouseUp);
      }
    };
  }
};
