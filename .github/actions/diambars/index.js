require("dotenv").config()
const fs = require("fs")
const { Octokit } = require("@octokit/core");
const { resolve } = require("path");

const { TOKEN_SECRET } = process.env

const octokit = new Octokit({ auth: TOKEN_SECRET });
const organizations = ["senegalouvert", "KaayCoder", "OpenCOVID19-Senegal","Code-for-Senegal"]

let diambars = []
let readme = ""

// check if an element exists in array using a comparer function
// comparer : function(currentElement)
Array.prototype.inArray = function (comparer) {
    for (var i = 0; i < this.length; i++) {
        if (comparer(this[i])) return true;
    }
    return false;
}

// adds an element to the array if it does not already exist using a comparer 
// function
Array.prototype.pushIfNotExist = function (element,repo, comparer) {
    if (!this.inArray(comparer)) {
        this.push(element);
    }else{
        diambars[this.findIndex(comparer)].contributions +=1
        diambars[this.findIndex(comparer)].repos.push(repo)
    }
}

const getRepos = (organization) => {
    return octokit.request("GET /orgs/{org}/repos", {
        org: organization
    }).then(data => {
        const { data: repos } = data
        return repos
    })
}

const getContributors = (organization, repo) => {
    return octokit.request('GET /repos/{owner}/{repo}/contributors', {
        owner: organization,
        repo: repo
    }).then(data => {
        const { data: contributors } = data
        return contributors
    })
}

const addContributor = (contributor, repo) => {
    return new Promise((resolve) => {
        const { login, avatar_url } = contributor
        const element = { login: login, avatar: avatar_url, contributions:1, repos:[repo]  }
        diambars.pushIfNotExist(element,repo, function (e) {
            return e.login === element.login && e.avatar === element.avatar;
        })
    })
}

const formatUser = (diambars) => {
    return diambars.map(u => `<div class="pull-right"><a href="https://github.com/${u.login}"><img src="${u.avatar}&size=50" /><br>${u.login}</a></div>\n`).join("")
}

const creatReadme = (diambars) => {
    return new Promise((resolve) => {
        readme = `# Diambars Decorations

Decorations for distinguished contributor to Code for Senegal

## Merit classes

The order is made up of the following merit classes:

* [Grand cross](#Grand-cross)
* [Grand officer](#Grand-officer)
* [Commander](#Commander)
* [Officer](#Officer)
* [Knight](#Knight)

### Grand cross

![Grand cross](https://upload.wikimedia.org/wikipedia/commons/c/c1/SEN_Order_of_the_Lion_-_Grand_Cross_BAR.png)

${
            formatUser(diambars.filter(d => d.contributions >= 100))
}
### Grand officer

![Grand cross](https://upload.wikimedia.org/wikipedia/commons/4/44/SEN_Order_of_the_Lion_-_Grand_Officer_BAR.png)

${
            formatUser(diambars.filter(d => d.contributions >= 50 && d.contributions <100))
}
### Commander

![Grand cross](https://upload.wikimedia.org/wikipedia/commons/5/55/SEN_Order_of_the_Lion_-_Commander_BAR.png)

${
            formatUser(diambars.filter(d => d.contributions >= 25 && d.contributions < 50))
}
### officer

![Grand cross](https://upload.wikimedia.org/wikipedia/commons/5/5c/SEN_Order_of_the_Lion_-_Officer_BAR.png)

${
            formatUser(diambars.filter(d => d.contributions>= 5 && d.contributions < 25))
}
### Knight

![Grand cross](https://upload.wikimedia.org/wikipedia/commons/b/b0/SEN_Order_of_the_Lion_-_Knight_BAR.png)

${
            formatUser(diambars.filter(d => d.contributions >= 1 && d.contributions < 5))
}
`
        
        fs.writeFileSync("../../../README.md", readme, 'utf8', (err) => {
            if (err) {
                return console.log(err);
            }
            resolve()
        })
    })
}

const getDiambars = async () => {

    for await (const organization of organizations) {
        const repos = await getRepos(organization)

        for await (const repo of repos) {
            let name = repo.full_name.split("/")
            const contributors = await getContributors(name[0], name[1])

            for await (const user of contributors) {
                addContributor(user, repo.full_name)
            }
        }
    }

    creatReadme(diambars)

    console.log('done')
}

getDiambars()
    .catch(err => {
        console.log(err)
    })