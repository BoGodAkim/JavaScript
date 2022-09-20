"use strict"
let fs = require("fs/promises");


// function getLogs check if there is a log for the commit and if there is, it will download it and save it in the folder logs
async function getLog(commit, baseUrl, login, token) {
    //check if there is a link to log for the commit
    if (typeof (commit._links.log.href) === typeof ("")) {
        // check if the log file is already downloaded
        await fs.access(`./data/logs/${commit.commitId.replaceAll(' ', '_')}-${commit.id}`, fs.F_OK)
            .then(async () => {
                // if the log file is already downloaded, then save log in commit object
                commit.log = await (await fs.readFile(`./data/logs/${commit.commitId.replaceAll(' ', '_')}-${commit.id}`)).toString();
            })
            .catch(async () => {
                // if the log file is not downloaded, then download it and save it in the folder logs and in the commit object
                console.log(`download: ${commit.commitId}-${commit.id}`);
                commit.log = await (await fetch(baseUrl + commit._links.log.href, {
                    "headers": {
                        "Authorization": 'Basic ' + btoa(login + ':' + token),
                    },
                    "body": null,
                    "method": "GET"
                })).text();
                await fs.writeFile(`./data/logs/${commit.commitId.replaceAll(' ', '_')}-${commit.id}`, commit.log)
            })
    }
}

// function getCommits returns all commits for the repository
async function getCommits(baseUrl, pipelineName, login, token) {
    // get all commits for the pipeline
    return await (await fetch(`${baseUrl}/blue/rest/organizations/jenkins/pipelines/${pipelineName}/runs/?start=0&limit=10000`, {
        "headers": {
            "Authorization": 'Basic ' + btoa(login + ':' + token),
        },
        "body": null,
        "method": "GET"
    })).json();
}

// function getCommitsForBranch returns all commits for the branch
async function getCommitsForBranch(baseUrl, pipelineName, branchName, login, token) {
    // get all commits for the pipeline for the branch
    return await (await fetch(`${baseUrl}/blue/rest/organizations/jenkins/pipelines/${pipelineName}/runs/?branch=${branchName}&start=0&limit=10000`, {
        "headers": {
            "Authorization": 'Basic ' + btoa(login + ':' + token),
        },
        "body": null,
        "method": "GET"
    })).json();
}

// function replayCommit replays the commit and returns the new commit
async function replayCommit(baseUrl, pipelineName, branchName, login, token, run = 1) {
    return await (await fetch(`${baseUrl}/blue/rest/organizations/jenkins/pipelines/${pipelineName}/branches/${branchName}/runs/${run}/replay/`, {
        "headers": {
            "Authorization": 'Basic ' + btoa(login + ':' + token),
            "content-type": "application/json",
        },
        "body": null,
        "method": "POST"
    })).json();
}

async function getStatisticsOfErrors(commits, baseUrl, login, token) {
    //TODO: work in progress
    let errors = new Map();
    for (const commit of commits) {

        if (commit.result === "FAILURE") {
            await getLog(commit, baseUrl, login, token);
        }
        else{
            continue;
        }

        let counter = 1;
        // use errorsCounter to check if we already have the same error message in this commit
        let errorsCounter = new Map();
        if ('log' in commit) {
            // get all the error messages from the log
            let log = commit.log.slice(commit.log.indexOf('failing'), commit.log.indexOf('=============================== Coverage summary ===============================') - 5);
            // split the error messages by errors
            while (log.includes(' ' + counter + ') ')) {
                // get the error message
                let errorBody = log.slice(log.indexOf(":", log.indexOf(' ' + counter + ') ')) + 3, log.indexOf(' ' + (counter + 1) + ') '));
                // get the error message body
                let error = log.slice(log.indexOf(' ' + counter + ') ') + (' ' + counter + ')').length, log.indexOf(":", log.indexOf(' ' + counter + ') ')));
                errorsCounter.set(error, 1);
                // save data about the error message in the map
                if (errors.has(error)) {
                    errors.get(error).all++;
                    if (errors.get(error).errorsBody.has(errorBody)) {
                        errors.get(error).errorsBody.set(errorBody, errors.get(error).errorsBody.get(errorBody) + 1);
                    } else {
                        errors.get(error).errorsBody.set(errorBody, 1);
                    }
                } else {
                    errors.set(error, {all: 1, inBuilds: 0, runs:[] ,errorsBody: new Map()});
                    if (errors.get(error).errorsBody.has(errorBody)) {
                        errors.get(error).errorsBody.set(errorBody, errors.get(error).errorsBody.get(errorBody) + 1);
                    } else {
                        errors.get(error).errorsBody.set(errorBody, 1);
                    }
                }
                counter++;
            }
            for (const error of errorsCounter.keys()) {
                errors.get(error).inBuilds++;
                errors.get(error).runs.push(`${commit.pipeline}:${commit.id}`);
            }
        }
    }

    return new Map([...errors].sort((a, b) => {
        let res = b[1].inBuilds - a[1].inBuilds;
        if (res === 0) {
            res = b[1].all - a[1].all;
        }
        return res;
    }));
}

async function findComitsWithFlakyTests(commits){
    // create a map of all the commits with the key being the commitId and the value being an array of all the builds for that commit
    let commitsMap = new Map();
    for (const commit of commits) {
        if (commit.result === 'SUCCESS' || commit.result === 'FAILURE') {
            let commitId = commit.commitId;
            if (commitsMap.has(commitId)) {
                commitsMap.get(commitId).push(commit)
            } else {
                let arrOfCommits = [];
                arrOfCommits.push(commit)
                commitsMap.set(commitId, arrOfCommits)
            }
        }
    }
    console.log(commitsMap.size);

    // create an array of all the commits that have both a success and a failure build
    let result = [];
    for (const singleCommitBuilds of commitsMap.values()) {
        let successFlag = false;
        let failureFlag = false;
        for (const commit of singleCommitBuilds) {
            if (commit.result === 'SUCCESS') {
                successFlag = true;
            }
            if (commit.result === 'FAILURE') {
                failureFlag = true;
            }
        }
        if (successFlag && failureFlag) {
            result.push(singleCommitBuilds);
        }
    }
    return result;
}

async function code(baseUrl, pipelineName, branchName, login, token, numberOfRuns = 10) {
    let commits = await getCommitsForBranch(baseUrl, pipelineName, branchName, login, token);
    //console.log(commits);
    if (commits[0].state === "FINISHED" && commits.length < numberOfRuns) {
        console.log(`replay: ${branchName}, ${commits[0].commitId}`);
        //await replayCommit(baseUrl, pipelineName, branchName, login, token, 1);
        await replayCommit(baseUrl, pipelineName, branchName, login, token, commits[0].id);
    }

    let result = await findComitsWithFlakyTests(commits);

    let errors = await getStatisticsOfErrors(result.flat(), baseUrl, login, token);
    //let errors = await getStatisticsOfErrors(commits, baseUrl, login, token);
    //TODO: save errors in the file
    console.log(`branchName:${branchName} runs:${commits.length}`);
    console.log(errors);
    //await fs.writeFile(`./data/errors/${branchName}.json`, errors);
}



async function findFlakyTests(baseUrl, pipelineName, login, token) {
    // get all commits for the pipeline
    let commits = await getCommits(baseUrl, pipelineName, login, token);

    console.log(commits.length)

    let result = await findComitsWithFlakyTests(commits);

    let errors = await getStatisticsOfErrors(result.flat(), baseUrl, login, token);
    // print sorted by the number of times the error message appears in the builds map
    console.log(result.length);
    console.log(errors);
    //TODO: save errors in the file
}

//setInterval(code, 2100000, "https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3111", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 30)
//setInterval(code, 2100000, "https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3115", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 30)
//setInterval(code, 2100000, "https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3116", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 30)
//setInterval(code, 2100000, "https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3117", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 30)
// async function test(){
//     await code("https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3111", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 10);
//     await code("https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3115", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 10);
//     await code("https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3116", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 10);
//     await code("https://jenkins.mgmt.consoleconnect.com", "WP - api", "PR-3117", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10", 10);
// }
// test();
//setInterval(findFlakyTests, 2100000, "https://jenkins.mgmt.consoleconnect.com", "WP - api", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10")
findFlakyTests("https://jenkins.mgmt.consoleconnect.com", "WP - api", "x-codete-b", "1123d0e44891879eae39c3d3e8556f2d10");