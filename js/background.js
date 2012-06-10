chrome.browserAction.onClicked.addListener(function(tab){
	chrome.tabs.create({url:'queryCloud.html'});
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse){
	if(!request.type){
		sendResponse("error");
	}else if(request.type === 'history'){

		chrome.history.search({
			text:'',
		 	startTime:request.params.startTime,
		 	maxResults:request.params.maxResults
		}, function(result){
			sendResponse(result);
		});
	}else if(request.type === 'save'){
		if(request.key && request.value){
			localStorage.setItem(request.key, JSON.stringify(request.value));
			sendResponse('success');
		}
	}else if(request.type === 'load'){
		if(request.key){
			var value = JSON.parse(localStorage.getItem(request.key));
			sendResponse(value?value:{});
		}
	}
});

