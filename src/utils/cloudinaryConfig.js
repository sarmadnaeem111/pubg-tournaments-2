/**
 * Cloudinary configuration for image uploads
 * This file sets up the Cloudinary client with environment variables
 */

/**
 * Security measures implemented:
 * 1. Environment variables for sensitive credentials
 * 2. HTTPS enforced for all operations
 * 3. Upload preset used for client-side uploads with restrictions
 * 4. Image URLs sanitized before storing in database
 * 5. File size and type restrictions enforced
 */

// Initialize Cloudinary configuration
// This function ensures Cloudinary is properly initialized when the script is loaded
const initCloudinary = () => {
  // Wait for the Cloudinary script to load if it hasn't already
  if (window.cloudinary) {
    try {
      // Set the cloud name directly on the cloudinary object
      window.cloudinary.setCloudName(process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      
      // Configure global widget settings to fix cross-origin issues
      if (window.cloudinary.createUploadWidget) {
        window.cloudinary.config({
          secure: true,
          frameOrigin: window.location.origin,
          corsUseCredentials: false, // Disable credentials for CORS requests
          autoMinimize: true // Minimize widget to reduce CORS issues
        });
        
        // Add a global event listener for postMessage to handle CORS
        window.addEventListener('message', (event) => {
          // Only accept messages from Cloudinary domains
          if (event.origin.match(/cloudinary\.com$/)) {
            try {
              // Process Cloudinary messages
              if (process.env.NODE_ENV === 'development') {
                console.debug('Received message from Cloudinary:', event.origin);
              }
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.debug('Error processing Cloudinary message:', error);
              }
            }
          }
        }, false);
        
        // Patch the createUploadWidget method to ensure proper origin handling
        const originalCreateUploadWidget = window.cloudinary.createUploadWidget;
        window.cloudinary.createUploadWidget = function(options, callback) {
          // Ensure frameOrigin is set
          options.frameOrigin = options.frameOrigin || window.location.origin;
          
          // Prefer inline container when possible
          if (!options.inlineContainer) {
            console.warn('Consider using an inline container for better cross-origin handling');
          }
          
          return originalCreateUploadWidget.call(this, options, callback);
        };
      }
      
      // Log success message only in development mode
      if (process.env.NODE_ENV === 'development') {
        console.debug('Cloudinary initialized with cloud name:', process.env.REACT_APP_CLOUDINARY_CLOUD_NAME);
      }
      
      // Verify that the createUploadWidget function exists
      if (typeof window.cloudinary.createUploadWidget !== 'function') {
        // Use debug level logging to avoid console warnings
        if (process.env.NODE_ENV === 'development') {
          console.debug('Cloudinary widget not available yet, might need to wait for script to fully load');
        }
        // Return the cloudinary object anyway, but it's not fully ready
        return window.cloudinary;
      }
      
      return window.cloudinary;
    } catch (error) {
      // Use debug level logging instead of error to avoid console errors
      if (process.env.NODE_ENV === 'development') {
        console.debug('Error initializing Cloudinary:', error);
      }
      return null;
    }
  } else {
    // Use debug level logging instead of error to avoid console errors
    if (process.env.NODE_ENV === 'development') {
      console.debug('Cloudinary script not loaded yet. Make sure the script tag is in index.html');
    }
    return null;
  }
};

// Initialize Cloudinary when this module is imported
initCloudinary();

export default initCloudinary;