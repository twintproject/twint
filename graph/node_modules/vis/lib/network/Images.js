import CachedImage from './CachedImage';

/**
 * This callback is a callback that accepts an Image.
 * @callback ImageCallback
 * @param {Image} image
 */

/**
 * This class loads images and keeps them stored.
 *
 * @param {ImageCallback} callback
 */
class Images {
  /**
   * @param {ImageCallback} callback
   */
  constructor(callback){
        this.images = {};
        this.imageBroken = {};
        this.callback = callback;
    }
    
    /**
     * @param {string} url                      The original Url that failed to load, if the broken image is successfully loaded it will be added to the cache using this Url as the key so that subsequent requests for this Url will return the broken image
     * @param {string} brokenUrl                Url the broken image to try and load
     * @param {Image} imageToLoadBrokenUrlOn   The image object
     */    
    _tryloadBrokenUrl (url, brokenUrl, imageToLoadBrokenUrlOn) {
        //If these parameters aren't specified then exit the function because nothing constructive can be done
        if (url === undefined || imageToLoadBrokenUrlOn === undefined)  return;
        if (brokenUrl === undefined) {
          console.warn("No broken url image defined");
          return;
        }
    
        //Clear the old subscription to the error event and put a new in place that only handle errors in loading the brokenImageUrl
        imageToLoadBrokenUrlOn.onerror = () => {
            console.error("Could not load brokenImage:", brokenUrl);
            // cache item will contain empty image, this should be OK for default
        };
        
        //Set the source of the image to the brokenUrl, this is actually what kicks off the loading of the broken image
        imageToLoadBrokenUrlOn.image.src = brokenUrl;
    }
    
  /**
   *
   * @param {vis.Image} imageToRedrawWith
   * @private
   */
  _redrawWithImage (imageToRedrawWith) {
        if (this.callback) {
            this.callback(imageToRedrawWith);
        }
    }
    
    /**
     * @param {string} url          Url of the image
     * @param {string} brokenUrl    Url of an image to use if the url image is not found
     * @return {Image} img          The image object
     */     
    load (url, brokenUrl) {
        //Try and get the image from the cache, if successful then return the cached image   
        var cachedImage = this.images[url]; 
        if (cachedImage) return cachedImage;
        
        //Create a new image
        var img = new CachedImage();

        // Need to add to cache here, otherwise final return will spawn different copies of the same image,
        // Also, there will be multiple loads of the same image.
        this.images[url] = img; 
        
        //Subscribe to the event that is raised if the image loads successfully 
        img.image.onload = () => {
            // Properly init the cached item and then request a redraw
            this._fixImageCoordinates(img.image);
            img.init();
            this._redrawWithImage(img);
        };
        
        //Subscribe to the event that is raised if the image fails to load
        img.image.onerror = () => {
            console.error("Could not load image:", url);
            //Try and load the image specified by the brokenUrl using
            this._tryloadBrokenUrl(url, brokenUrl, img);
        };
        
        //Set the source of the image to the url, this is what actually kicks off the loading of the image
        img.image.src = url;
        
        //Return the new image
        return img;
    }


  /**
   * IE11 fix -- thanks dponch!
   *
   * Local helper function
   * @param {vis.Image} imageToCache
   * @private
   */
    _fixImageCoordinates(imageToCache) {
        if (imageToCache.width === 0) {
            document.body.appendChild(imageToCache);
            imageToCache.width = imageToCache.offsetWidth;
            imageToCache.height = imageToCache.offsetHeight;
            document.body.removeChild(imageToCache);
        }
    }
}

export default Images;
