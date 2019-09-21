const bodyText = document.getElementById("body");
const reviewList = document.getElementById("review-list");
const author = document.getElementById("author");
const accessibility = document.getElementById("accessibility");
const preparation = document.getElementById("preparation-required");
const fines = document.getElementById("fines-and-fees");
const time = document.getElementById("time");

const submitButton = document.getElementById("submit");
submitButton.onclick = function (event) {
    const query = window.location.search;
    if (query.startsWith("?name=")) {
        const name = query.slice(6);

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/reviews/", true);
        xhr.setRequestHeader('Content-Type', 'application/json');

        let message = JSON.stringify({
            "name": name,
            "author": author.value,
            "body": bodyText.value,
            "accessibility": accessibility.value,
            "preparation required": preparation.value,
            "fines and fees": fines.value,
            "time": time.value,
        });
        xhr.send(message);

        let html = getStarGrouping(accessibility.value, preparation.value, fines.value, time.value);

        html += `<p>${bodyText.value}</p><hr>`;

        const entry = document.createElement("DIV");
        entry.innerHTML = html;
        reviewList.appendChild(entry);
    }
}

for (const starSelector of document.getElementsByClassName("star-selector")) {
    starSelector.starList = document.querySelectorAll("." + starSelector.id + " > img");
    starSelector.oninput = function (event) {
        const newScore = Number(event.target.value);
        updateStarStatus(newScore, starSelector.starList);
    }
    updateStarStatus(Number(starSelector.value), starSelector.starList);
}

function updateStarStatus(score, starList) {
    for (let i = 0; i < 5; ++i) {
        if (i + 1 <= score) {
            starList[i].src = "/star.svg";
        } else if (i + 0.5 === score) {
            starList[i].src = "/half-star.svg";
        } else {
            starList[i].src = "/empty-star.svg";
        }
    }
}

function getStarNodes(rating, label) {
    return `<div class="star-grouping">` + label +
        `<img class="rating" src="/star.svg">`.repeat(Math.floor(rating)) +
        `<img class="rating" src="/half-star.svg">`.repeat(2 * (rating - Math.floor(rating))) +
        `<img class="rating" src="/empty-star.svg">`.repeat(5 - Math.ceil(rating)) +
        `</div>`;
}

function getStarGrouping(...ratings) {
    const labels = ["assessibility", "preparation required", "fines and fees", "time"];
    let html = "<div class=\"star-grouping\">";

    for (let i = 0; i < 4; ++i) {
        html += getStarNodes(+ratings[i], labels[i]);
    }
    html += "</div>";
    return html;
}