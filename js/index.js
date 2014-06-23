global.$ = $;

(function(undefined){

var ls = localStorage;
var jp = JSON.parse;
var js = JSON.stringify;

var server = require("server");
var PHost = server.PHost;

//init data
var hostId = ls["hostId"] ? ls["hostId"] : "1";
var hostHash = ls["hostHash"] ? ls["hostHash"] : js({ "0":"单击", "1": "双击" });
var hostNamePrefix = "PHost-";

ls[hostNamePrefix + "base-host"] = '#提交bug: https://github.com/paper/PHost/issues'+
									'\n#说明：这个是基础 host。也就是说，即使你切换不同的host，都会包含这个里面的内容。';

ls[hostNamePrefix + "0"] = "#单击：查看对应的host内容";
ls[hostNamePrefix + "1"] = "#双击：把对应的host设置为系统host";

$(function(){

  var $baseHostBtn = $("#J-base-host");
  var $addHostBtn = $("#J-add-host-btn");
  
  var $hostArea = $("#J-host-area");
  
  var $pop = $(".pop");
  var $popCloseBtn = $(".pop .close-btn");
  var $lightbox = $("#J-lightbox");
  
  var $popAddHost = $("#J-pop-add-host");
  var $popAddHostNameInput = $("#J-add-host-name");
  var $popAddHostBtn = $popAddHost.find(".pop-content .btn");
  
  var $popDelHost = $("#J-pop-del-host");
  var $popDelHostName = $popDelHost.find(".pop-content .q strong");
  var $popDelCancelBtn = $popDelHost.find(".pop-content .btn-cancel");
  var $popDelOkBtn = $popDelHost.find(".pop-content .btn-warning");
  
  var $nodeList = $("#J-node-list");
  var $nodeListWrap = $nodeList.find("ul");
  var $nodeListAllLinks = $nodeList.find("a");
  
	//提示
	var $tip = $("#J-tip");
	var $tipContent = $tip.find("p");
	var tipTime = null;
	var tipStayTime = 1000;
	
	//写host
	var hostAreaChangeTime = null;
	var hostAreaChangeInterval = 200;
	
  function showLightbox(){ $lightbox.fadeIn("fast"); }
  function hideLightbox(){ $lightbox.fadeOut("fast"); }
	
	function getHostId(){
		hostId = (+hostId) + 1;
		ls["hostId"] = hostId;
		
		return hostId + "";
	}
	
	var hostContentOp = {
		get : function(id){
			return ls[hostNamePrefix + id];
		},
		
		set : function(id, data){
			ls[hostNamePrefix + id] = data;
		},
		
		clear : function(id){
			this.set(id, "");
	  }
	}
	
	//hostHash 相关操作
	var hostHashOp = {
		get : function(){
			return jp( hostHash );
		},
		
		set : function(id, title){
			var obj = jp( hostHash );
			obj[id] = title;
			//updata
			var objStr = js( obj );
			ls["hostHash"] = objStr;
			hostHash = objStr;

			return obj;
		},
		
		del : function(id){
			var obj = jp( hostHash );
			
			if( typeof obj[id] != "undefined" ){
				delete obj[id];
				//updata
				var objStr = js( obj );
				ls["hostHash"] = objStr;
				hostHash = objStr;
				
				hostContentOp.clear(id);
			}
			
			return obj;
		}
		
	}//end hostHashOp
	
	var popOp = {
		hide : function(){
			$pop.fadeOut("fast");
			hideLightbox();
		},
		
		showAddHost : function(callback){
			showLightbox();
			$popAddHost.fadeIn("fast");
			//reset
			$popAddHostNameInput
			.attr("placeholder", "添加新的Host")
			.val("")
			.focus(); 
			
			callback && callback($popAddHostNameInput, $popAddHostBtn);
		},
		
		showDelHost : function(callback){
			showLightbox();
			$popDelHost.fadeIn("fast");
			$popDelHostName.html(''); //reset
			
			callback && callback($popDelHostName, $popDelOkBtn);
		},
		
		shake : function(){
			$pop.addClass("pop-shake");
			setTimeout(function(){ $pop.removeClass("pop-shake"); }, 500);
		}
	}
	
  function getNodeListItemHtml(id, title){
		var exData = 'data-id="'+id+'" data-title="'+title+'"';
		var nodeItemId = 'J-node-item-'+ id;
		
		var nodeItemHtml = '<li id="'+ nodeItemId +'" class="node-item" '+exData+'>'+
								'<a href="javascript:;">'+
									'<p class="host-title"><span>'+ title +'</span></p>'+
									'<div class="extra extra-1">'+
										'<span class="link op-edit"><i class="ico ico-edit"></i></span>'+
										'<span class="link op-del"><i class="ico ico-del"></i></span>'+
									'</div>'+
									'<div class="extra extra-2">'+
										'<span class="link"><i class="ico ico-right"></i></span>'+
									'</div>'+
								'</a>'+
							'</li>';
		
		return nodeItemHtml;
  }

	//如果用户输入的host名字太长，那么就要添加title属性
	function checkLongTitle($nodeItem){
		var $hostTitle = $nodeItem.find(".host-title");
		var $titleWord = $nodeItem.find(".host-title span");
		
		var titleWidth = $titleWord.width();

		if( titleWidth > 200 ){
			$hostTitle.attr("title", $titleWord.html());
		}else{
			$hostTitle.removeAttr("title");
		}
	}
	
	//添加一个host
	function addHost(id, title){
		
		//if addHost(title)
		if( arguments.length == 1 ){
			title = id;
			id = getHostId();
		}
		
		title = PHost.filterXss(title);
		
		hostHashOp.set(id, title);
		
		if( hostContentOp.get(id) === undefined ){
			hostContentOp.set(id, '# host 请写这里:\n');
		}
		
		var nodeItemHtml = getNodeListItemHtml(id, title);
		$nodeListWrap.prepend(nodeItemHtml);
		
		var $curNodeItem = $("#J-node-item-" + id);
		checkLongTitle( $curNodeItem );
		
		return $curNodeItem;
	}
	
	function getParentNodeItemData($self){
		var $nodeItem =$self.parents(".node-item");
    var id = $nodeItem.attr("data-id");
    var title = $nodeItem.attr("data-title");
		
		return {
			$nodeItem : $nodeItem,
			id : id,
			title : title
		}
	}
	
	function writeHostIntoSys(data){
		var d = hostContentOp.get("base-host") + "\n\n" + data;
		PHost.setSysHost( d );
		return d;
	}
	
	function keyboardEnter( factorFunc, callback ){
		
		//if keyboardEnter(callback)
		if( arguments.length == 1 ){
			 callback = factorFunc;
			 factorFunc = function(){ return true };
		}
		
		document.onkeyup = function(ev){
			if( factorFunc() === true && ev.keyCode == 13 ){
				callback && callback();
			}
		}
		
	}
	
	//显示提示
	function showTip(msg){
		clearTimeout(tipTime);
		
		msg = msg || "操作成功";
		
		$tipContent.html(msg);
		$tip.show();

		tipTime = setTimeout(function(){
			$tip.hide();
		}, tipStayTime);
	}
	
	//------------------------------------- event --------------------------------------
	
  $popCloseBtn.on("click", function(){ popOp.hide(); });
  $popDelCancelBtn.on("click", function(){ popOp.hide(); });
  
	//基础host（父） 点击
  $baseHostBtn.on("click", function(){
    $hostArea.val( hostContentOp.get("base-host") );
		
		$(".side .node-item a").removeClass("node-item-click");
		$(this).addClass("node-item-click");
		
		var nodeItemData = getParentNodeItemData($baseHostBtn);
    var id = nodeItemData.id;
    var title = nodeItemData.title;
		
		$hostArea.attr({
			"data-id" : id,
			"data-title" : title,
			"data-writeSys" : 0
		});
  });
	
	//添加新的host
  $addHostBtn.on("click", function(ev){
    popOp.showAddHost(function($input, $btn){
		
			function okBtnAction(){
				var newTitle = $.trim( $input.val() );
        
        if( newTitle == "" ){
          popOp.shake();
          $input.focus();
          return;
        }
				
				$curNodeItem = addHost(newTitle);
				checkLongTitle($curNodeItem);

				popOp.hide();
			}
			
			keyboardEnter(function(){
				return document.activeElement.id == "J-add-host-name";
			}, function(){
				console.log(111);
				okBtnAction();
			});
			
      $btn[0].onclick = function(){
				okBtnAction();
      }
      
    });
  });
	
	//修改host名称
  $nodeList.on("click", ".op-edit", function(ev){
    ev.stopPropagation();
    
    var $self = $(this);
		var nodeItemData = getParentNodeItemData($self);
		var $nodeItem = nodeItemData.$nodeItem;
    var id = nodeItemData.id;
    var title = nodeItemData.title;
		
    popOp.showAddHost(function($input, $btn){
      $input.val(title).select();
      $input.attr("placeholder", "想把 \""+ title +"\" 修改成？");
      
			function okBtnAction(){
				var newTitle = $.trim( $input.val() );
        
        //如果没有修改name
        if( newTitle == title ) { popOp.hide(); return; }
        
        if( newTitle == "" ){
          popOp.shake();
          $input.focus();
          return;
        }
				
				newTitle = PHost.filterXss(newTitle);
				
				$nodeItem.attr("data-title", newTitle);
				var $hostTitle = $nodeItem.find(".host-title span");
				$hostTitle.html(newTitle);
				
				checkLongTitle($nodeItem);
				
				hostHashOp.set(id, newTitle);
				
				popOp.hide();
			}
			
			keyboardEnter(function(){
				return document.activeElement.id == "J-add-host-name";
			}, function(){
				okBtnAction();
			});
			
      $btn[0].onclick = function(){
        okBtnAction();
      }
      
    });
  });//end op-edit

	//删除 host
  $nodeList.on("click", ".op-del", function(ev){
    ev.stopPropagation();
    
    var $self = $(this);
    var nodeItemData = getParentNodeItemData($self);
		var $nodeItem = nodeItemData.$nodeItem;
    var id = nodeItemData.id;
    var title = nodeItemData.title;
    
    popOp.showDelHost(function($hostName, $btn){
      $hostName.html(title);
      
      $btn[0].onclick = function(){
				hostHashOp.del(id);
				$nodeItem.remove();
				
				popOp.hide();
      }

    });
  });//end op-del
  
	//host列表点击
  $nodeList.on("click", "a", function(){
    var $self = $(this);
		
		var nodeItemData = getParentNodeItemData($self);
    var id = nodeItemData.id;
    var title = nodeItemData.title;
    
    $(".side .node-item a").removeClass("node-item-click");
    $(this).addClass("node-item-click");
		
		$hostArea.val( hostContentOp.get(id) );
		
		$hostArea.attr({
			"data-id" : id,
			"data-title" : title,
			"data-writeSys" : 0
		});
		
  });//end nodeList a
  
	//host列表双击
  $nodeList.on("dblclick", "a", function(){
    var $self = $(this);
		
    var nodeItemData = getParentNodeItemData($self);
    var id = nodeItemData.id;
    var title = nodeItemData.title;
    
    $(".side .node-item a").removeClass("node-item-dblclick");
    $(this).addClass("node-item-dblclick");

    PHost.setSysHost(  writeHostIntoSys(hostContentOp.get(id)) );
		
		//showTip();
		
		$hostArea.attr({
			"data-id" : id,
			"data-title" : title,
			"data-writeSys" : 1
		});
  });//end nodeList a
  
	//写host
	$hostArea.keyup(function(){
		clearTimeout(hostAreaChangeTime);
		
		hostAreaChangeTime = setTimeout(function(){
			var id = $hostArea.attr("data-id");
			var title = $hostArea.attr("data-title");
			var writeSys = +$hostArea.attr("data-writeSys");
			
			var data = $hostArea.val();
		
			hostContentOp.set(id, data);
			
			if( writeSys == 1 ){
				writeHostIntoSys(data);
			}
		}, hostAreaChangeInterval);
	});

	
  //页面初始化
  function PHostInit(){
		console.log( js(hostHash) );
		var hostHashObj = hostHashOp.get();
		
		for(var key in hostHashObj){
			var id = key;
			var title = hostHashObj[key];
			
			addHost(id, title);
		}
  }
	
  PHostInit();
  
});

})();
