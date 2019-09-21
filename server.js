var express = require('express');
var app = express();
var path = require('path');
var fs = require('fs');
var url = require('url');
var bodyParser = require('body-parser');

var resources = require('./resource-list.json');
var reviews = require('./reviews.json');

const serviceList = ["possession", "felony", "juvenile", "rehabilitation", "immigration", "petition", "court", "library", "records", "selfhelp", "FAQs", "survey"];


app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

function getHandler(request, response) {
    let pathname = url.parse(request.url).pathname;

    if (pathname.endsWith("/")) {
        pathname = path.join(pathname, "index.html");
    }

    const sourcePath = path.join(__dirname, "src");
    const fullPath = path.join(sourcePath, pathname);

    if (pathname.endsWith("index.html")) {
        //TODO inject data into landing page
        fs.readFile(fullPath, 'utf8', function (err, data) {
            if (err) {
                response.send(fullPath + " not found");
                response.end();
            } else {
                let html = data;

                //if keywords are specified, perform filtering
                let acceptableResources = resources;
                if (typeof request.query.query === String) {
                    acceptableResources = filterByKeywords(acceptableResources, request.query.query);

                    //populate the search bar with the active query
                    html = html.replace(`<input name="query">`, `<input name="query" value="${request.query.query}>`);
                }

                if (request.query["minimum-rating"]) {
                    acceptableResources = filterByMinimumRating(acceptableResources, reviews, Number(request.query["minimum-rating"]));

                    //populate the rating stars with the requested rating
                    html = html.replace(`step="0.5" value="4"`, `step="0.5" value="${request.query["minimum-rating"]}"`);
                }

                let requestedServices = [];
                for (const service of serviceList) {
                    if (request.query[service] === "on") {
                        requestedServices.push(service);
                    }
                }

                //of at least one service is specifically requested, assume all non-specified services are unwanted
                if (requestedServices.length > 0) {
                    for (const service of serviceList) {
                        if (!requestedServices.includes(service)) {
                            //populate the rating stars with the requested rating
                            html = html.replace(`name="${service}" checked="true"`, `name="${service}"`);
                        }
                    }

                    acceptableResources = filterOutMissingServices(acceptableResources, requestedServices);
                }

                if (html.includes("<resource-list />") > -1) {
                    let listNode = "<div id='resource-list'>\n";
                    for (let resource of acceptableResources) {
                        const review = getReviewOfResource(resource, reviews);

                        listNode += `<div class="resource-entry">
                        <img class="preview" src=${resource.img}></img>`;

                        listNode += "<a href=\"/reviews/?name=" + encodeURI(resource.name) + "\" class=\"rating\">Reviews</a>";

                        listNode += `<a href="${resource.url}">${resource.name}</a>
                        <p class="location">${resource.location}</p>
                        <p class="description">\"${resource.description}\"</p><br>
                        ${resource.services.split(" ").map(service => `<a class="tags" href=/?${service}=on>${service}</a>`).join("")}
                        </div>`;
                    }
                    listNode += '</div>'

                    if (acceptableResources.length < resources.length) {
                        listNode = `<br><p>Matching resources: ${acceptableResources.length}</p>\n` + listNode;
                    }

                    html = html.replace(/\<\s*resource-list\s*\/\>/, listNode);
                }

                if (html.includes("<reviews />")) {
                    const nameOfResource = decodeURI(request.query.name);
                    const resource = resources.find(x => x.name === nameOfResource);
                    if (resource) {
                        const reviewData = getReviewOfResource(resource, reviews);

                        let listNode = "<div id='review-list'>\n";
                        for (let review of reviewData.reviews) {
                            listNode += getStarGrouping(review.accessibility, review["preparation required"], review["fines and fees"], review["time"]);

                            listNode += `<p>${review.body}</p><hr>`;
                        }
                        listNode += '</div>'

                        html = html.replace(/\<\s*reviews\s*\/\>/, listNode);

                        //attach the name of the current resource name to a hidden input so it gets re-POSTed
                        html = html.replace(`name="name" value=""`, `name="name" value="${request.query.name}"`);
                    }
                }

                response.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Content-Length': html.length,
                    'Expires': new Date().toUTCString()
                });
                response.end(html);
            }
        });
    } else {
        response.sendFile(fullPath);
    }
}


app.get("*", getHandler);

app.post("/reviews/", function (request, response) {
    if (request.body.author) {
        const resourceName = decodeURI(request.body.name);
        const resource = resources.find(x => x.name === resourceName);
        if (resource) {
            const reviewData = getReviewOfResource(resource, reviews);
            if (reviewData) {
                const author = request.body.author;
                const body = request.body.body;
                const accessibility = request.body.accessibility;
                const preparation = request.body["preparation required"];
                const fines = request.body["fines and fees"];
                const time = request.body.time;
                reviewData.reviews.push({
                    "author": author,
                    "body": body,
                    "accessibility": accessibility,
                    "preparation required": preparation,
                    "fines and fees": fines,
                    "time": time
                });
            }
        }
    }

    getHandler(request, response);
});

// var itemRouter = express.Router();
// itemRouter.get('/', function (request, response) {
//     response.send('GET request to the homepage');
// });
// itemRouter.post('/', function (request, response) {
//     response.send('POST request to the homepage');
// });

app.listen(process.env.port || 3000);

function filterByKeywords(resources, query) {
    //ignore all punctuation except for 's
    const filtered = query.toLowerCase()
        .replace(/[\s\.]+/g, " ") //combine sequences of spaces and commas into a single separator
        .replace(/[^a-z ']/g, ""); //remove punctuation

    //ignore common words
    const keywords = filtered.split(" ").filter((x) => !["of", "a", "and"].includes(x));

    //include only resources who's name contains one of the specified keywords
    return resources.filter(resource => {
        const lowerCaseName = resource.name.toLowerCase();
        for (const keyword of keywords) {
            if (lowerCaseName.includes(keyword)) {
                return true;
            }
        }

        return false;
    });
}

function filterByMinimumRating(resources, reviews, minimumRating) {
    //include only resources who's name contains one of the specified keywords
    return resources.filter(resource => {
        const review = getReviewOfResource(resource, reviews);
        return review.avgRating === null || review.avgRating >= minimumRating;
    });
}

function getReviewOfResource(resource, reviews) {
    const review = reviews.find(review => review.name === resource.name);
    console.assert(review, "resource: ", resource, "reviews: ", reviews);
    return review;
}

function filterOutMissingServices(resources, requestedServices) {

    //include only resources who's name contains one of the specified keywords
    return resources.filter(resource => {
        const offeredServices = resource.services.split(" ");
        for (const keyword of requestedServices) {
            if (offeredServices.includes(keyword)) {
                return true;
            }
        }

        return false;
    });
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