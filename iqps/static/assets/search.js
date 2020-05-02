window.onload = () => {
            let historyStr = localStorage.getItem("history");
            if (historyStr != undefined && historyStr != "" && historyStr != "{}"){
                let data = JSON.parse(historyStr);
                let hist = document.getElementById("history-box");

                hist.innerHTML = "<h5>Recent Searches:</h5>";
                data.items.forEach((elt) => {
                    hist.innerHTML += `<span>${elt}</span>`;
                });
            }
        };
    const target = document.getElementById("search-box");
    const resultBox = document.getElementById("result-box");

    var queryStr = "";
    var isactive = false;
    var queryOk = true;

    $("#searchbar").focus(() => {
        try{
            $("#placeholder").remove();
        }catch(err){
            console.log("");
        }finally{
            isactive = true;
            $("#search-box").css("transform", "translateY(20vh)");
        }
    });
    $("#searchbar").focusout(() => {
        if ($("#searchbar").text() != ""){
            $("#search-box").css("transform", "translateY(20vh)");
        }else{
            isactive = false;
            resultBox.innerHTML = "";
            $("#search-box").css("transform", "translateY(30vh)");
            $("#history-box").css("display", "flex");
        }
    });

   const config = {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true
    };

    function historyPush(data){
        console.log(data);
        let historyStr = localStorage.getItem("history");
        if (historyStr == undefined || historyStr == "" || historyStr == "{}"){
            historyObj = {
                items: [data]
            };
            localStorage.setItem("history", JSON.stringify(historyObj));
        }else{
            let historyObj = JSON.parse(historyStr);
            if (historyObj.items.length == 5)
                historyObj.items.pop();
            historyObj.items.unshift(data);
            console.log(historyObj);
            localStorage.setItem("history", JSON.stringify(historyObj));
        }
    }

    function queryApiCaller(data){
        if (queryOk && data.length > 0){
            queryOk = false;
            $("#history-box").css('display', 'none');
            setTimeout(() => {
                queryOk = true;
                let queryStr = data;
                
                let buff;

                buff = $("#id_year").val();
                if (buff != "")
                    queryStr += ("&year=" + buff);
                buff = $("#id_department").val();
                if (buff != "")
                    queryStr += ("&dep=" + buff);
                buff = $("#id_paper_type").val();
                if (buff != "")
                    queryStr += ("&typ=" + buff);
                buff = $("#id_keywords").val();
                if (buff.length > 0)
                    queryStr += ("&keys=(\"" + buff.join("\", \"") + "\")");
                resultBox.innerHTML = "";
                $.get("/search/api?q=" + queryStr, (data, stat) => {
                    if (isactive){
                        data.papers.forEach((elt) => {
                            let htmlResult = `
                            <div class="result">
                            <span class="result-name">${elt[0]}</span>
                            <span><span class="result-type">${elt[1]}-${elt[3]}</span>
                            <span class="result-dep">${elt[2]}</span></span>
                            <a href="${elt[4]}" class="result-link" target="_blank" onclick="saveHistory(event)"}>Download</a>`;
                            if (elt.length == 6)
                                htmlResult += `<span class="result-keywords">Keywords: ${elt[5].replace(",", ", ")}</span></div>`;
                            else
                                htmlResult += `</div>`;
                            resultBox.innerHTML += htmlResult;
                        });
                        resultBox.innerHTML += `
                        <span><small>Not found what you're looking for? <a href="#top">Try filters</a> or <a href="/request">Request for it!</a></small></span>
                        `
                    }

                });
            }, 300);
        }
    }

    const callback = function(mutationList, observer){
        for (let mutation of mutationList){
            console.log(mutation);
            if ((mutation.type == "childList" || mutation.type == "characterData") &&
                (mutation.target.id == "searchbar" || mutation.target.parentNode.id == "searchbar")){
                let data = mutation.target.innerText || mutation.target.data;
                queryStr = data;
                queryApiCaller(data);
            }
        }
    }

    const debouncer = function(fn, delay){
        let timer;
        return function(){
            let ctx = this,
                args = arguments;
            clearTimeout(timer);
            setTimeout(() => {
                console.log(args);
                fn.apply(ctx, args);
            }, delay);
        }
    }
    const observer = new MutationObserver(callback);
    observer.observe(target, config);

    $("body").keypress((e) => {
        if (e.keyCode == 13)
        e.preventDefault();
    });

    $("#id_year, #id_department, #id_paper_type, #id_keywords").on('input', () => {
        queryApiCaller(queryStr);
    })

    function saveHistory(e){
        let data = `<a href="${e.target.href}">${e.target.parentNode.children[0].innerText}</a>`;
        historyPush(data);
    }

