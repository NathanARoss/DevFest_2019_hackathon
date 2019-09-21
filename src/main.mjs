const submitButton = document.getElementById("submit-name-to-list");
const nameField = document.getElementById("name-field");
const list = document.getElementById("services-list");
const menuOpener = document.getElementById("menu-opener");
const menu = document.getElementById("menu");
const starList = document.getElementsByClassName("rating");
const starSelector = document.getElementById("star-selector");

// submitButton.onclick = function (event) {
//     var xhr = new XMLHttpRequest();
//     xhr.open("POST", "/", true);
//     xhr.setRequestHeader('Content-Type', 'application/json');
//     xhr.send(JSON.stringify({
//         name: nameField.value
//     }));

//     const entry = document.createElement("p");
//     entry.innerHTML = nameField.value;
//     list.appendChild(entry);
// }

menuOpener.onclick = function (event) {
    menu.classList.toggle("closed");
    event.stopPropagation();
}

menu.onclick = function (event) {
    event.stopPropagation();
}

//if javascript is enabled, close the menu and allow the user to toggle it open
menu.classList.add("closed");

document.body.onclick = function (event) {
    menu.classList.add("closed");
}

starSelector.oninput = function (event) {
    const newScore = Number(event.target.value);
    updateStarStatus(newScore);
}

function updateStarStatus(score) {
    for (let i = 0; i < 5; ++i) {
        if (i + 1 <= score) {
            starList[i].src = "star.svg";
        } else if (i + 0.5 === score) {
            starList[i].src = "half-star.svg";
        } else {
            starList[i].src = "empty-star.svg";
        }
    }
}
updateStarStatus(Number(starSelector.value));