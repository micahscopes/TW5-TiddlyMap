/*\

title: $:/plugins/felixhayashi/tiddlymap/dialog_manager.js
type: application/javascript
module-type: library

@preserve

\*/

(function(){

  /*jslint node: true, browser: true */
  /*global $tw: false */
  
  "use strict";
  
  /**************************** IMPORTS ****************************/
   

  var utils = require("$:/plugins/felixhayashi/tiddlymap/utils.js").utils;
  var CallbackRegistry = require("$:/plugins/felixhayashi/tiddlymap/callback_registry.js").CallbackRegistry;

  /***************************** CODE ******************************/
        
  /**
   * @constructor
   */
  var DialogManager = function(context, callbackRegistry) {
    
    // create shortcuts and aliases
    this.wiki = $tw.wiki;
    this.logger = $tw.tiddlymap.logger;
    this.adapter = $tw.tiddlymap.adapter;
    this.opt = $tw.tiddlymap.opt;
    
    // create callback registry
    this.callbackRegistry = callbackRegistry;
    
    if(context) {
      this.context = context;
    }

  };
  
  
  /**
  * This function opens a dialog based on a skeleton and some fields and eventually
  * calls a callback once the dialog is closed. The callback contains an indicator
  * whether the dialog subject was confirmed or the operation cancelled. In any
  * case the output tiddler is passed to the callback. Each dialog may write its
  * changes to this tiddler in order to store the dialog result and make it available
  * to the callback.
  * 
  * How does it work?
  * 
  * The output of the dialog process is stored in a temporary tiddler that is only known
  * to the current instance of the dialog. This way it is ensured that only the dialog process
  * that created the temporary tiddler will retrieve the result. Now we are able to
  * provide unambigous and unique correspondance to dialog callbacks.
      
  * Any dialog output is stored in a unique output-tiddler. Once there is a result,
  * a new result tiddler is created with indicators how to interpret the output.
  * The result tiddler can be understood as exit code that is independent of the output.
  * It is the result tiddler that triggers the dialog callback that was registered before.
  * the output is then read immediately from the output-tiddler.
  * 
  * @param {string} name - A suffix that denotes a tiddler if combined
  *     with the dialog prefix.
  * @param {Hashmap} [param] - All properties (except those with special meanings)
  *     of param will be accessible as variables in the modal
  * @param {string} [param.subtitle] - 
  * @param {string} [param.cancelButtonLabel] - The label of the cancel button.
  * @param {string} [param.confirmButtonLabel] - The label of the confirm button.
  * @param {function} [callback] - A function with the signature
  *     function(isConfirmed, outputTObj). `outputTObj` contains data
  *     produced by the dialog (can be undefined even if confirmed!).
  *     Be careful: the tiddler that outputTObj represents is deleted immediately.
  */
  DialogManager.prototype.open = function(name, param, callback) {
    
    if(!param) { param = {}; }
    
    // create a temporary tiddler reference for the dialog
    var dialogTRef = this.opt.path.tempRoot + "/dialog-" + utils.genUUID();
    
    // fields used to handle the dialog process
    var dialog = {
      title: dialogTRef,
      footer: utils.getText(this.opt.ref.dialogStandardFooter),
      output: dialogTRef + "/output",
      result: dialogTRef + "/result",
      confirmButtonLabel: "Okay",
      cancelButtonLabel: "Cancel"
    };
    
    if(param.dialog) {
      
      if(param.dialog.preselects) {
        
        // register preselects
        this.wiki.addTiddler(new $tw.Tiddler(
          { title : dialog.output },
          param.dialog.preselects
        ));
        
        // remove preselects from param object
        delete param.dialog.preselects;
        
      }
      
      // extend the dialog object with parameters provided by the user
      $tw.utils.extend(dialog, param.dialog);
      
      // remove the user provided dialog object
      delete param.dialog;
      
    }
    
    // add trigger 
    this.callbackRegistry.add(dialog.result, function(t) {

      var triggerTObj = this.wiki.getTiddler(t);
      var isConfirmed = triggerTObj.fields.text;
      
      if(isConfirmed) {
        var outputTObj = this.wiki.getTiddler(dialog.output);
      } else {
        var outputTObj = null;
        $tw.tiddlymap.notify("operation cancelled");
      }
      
      if(typeof callback == "function") {
        if(this.context) {
          callback.call(this.context, isConfirmed, outputTObj);
        } else {
          callback(isConfirmed, outputTObj);
        }
      }
      
      // close and remove the tiddlers
      utils.deleteTiddlers([dialog.title, dialog.output, dialog.result]);
      
    }.bind(this), true);
    
    // get the dialog template
    var skeleton = utils.getTiddler(this.opt.path.dialogs + "/" + name);
    var dialogTiddler = new $tw.Tiddler(skeleton, param, dialog);
    this.wiki.addTiddler(dialogTiddler);
    
    $tw.rootWidget.dispatchEvent({
      type: "tm-modal", param : dialogTiddler.fields.title, paramObject: dialogTiddler.fields
    }); 
    
    this.logger("debug", "Opened dialog", dialogTiddler);
    
  };

  // !! EXPORT !!
  exports.DialogManager = DialogManager;
  // !! EXPORT !!
  
})();

