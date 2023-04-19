tevent.listen('cpu_mem_sync', (event) => {
    console.log(event.payload);

    syncStatusChart.options.barColor = event.payload.catchup == "true" ? "#0F62FE" : event.payload.catchup == "false" ? "#43BE66" : "#FF2632";
    syncStatusChartPercent.textContent = event.payload.catchup == "true" || event.payload.catchup == "false" ? event.payload.height : "!";
    syncStatusChartPopupText.innerText = event.payload.catchup == "true" ? "Syncing...\n\nCurrent Block: " + event.payload.height : event.payload.catchup == "false" ? "Node is synced!" : "Can't get sync status!";
    if (event.payload.catchup == "true") {
        setTimeout(() => {
            syncStatusChart.update(100);
            setTimeout(() => {
                syncStatusChart.update(0);
            }, 2300);
        }, 2300);
    } else {
        syncStatusChart.update(100);
    }

    if (event.payload.cpu < 100) {
        cpuStatusChart.update(Math.floor(event.payload.cpu));
        cpuStatusChartPercent.textContent = Math.floor(event.payload.cpu) + "%";
    }
    memStatusChart.update(Math.floor(event.payload.mem));
    memStatusChartPercent.textContent = Math.floor(event.payload.mem) + "%";

    const eachSidebarTag = document.querySelectorAll(".each-sidebar-tag");
    if (event.payload.status == "active") {
        eachSidebarTag[0].classList.remove("sidebar-inactive-tag");
        eachSidebarTag[0].classList.add("sidebar-active-tag");
        eachSidebarTag[0].textContent = "Active";
    } else if (event.payload.status == "") {
        eachSidebarTag[0].textContent = "Loading...";
    } else {
        eachSidebarTag[0].classList.add("sidebar-inactive-tag");
        eachSidebarTag[0].classList.remove("sidebar-active-tag");
        eachSidebarTag[0].textContent = event.payload.status.charAt(0).toUpperCase() + event.payload.status.slice(1);
    }
    if (event.payload.version) {
        version_new = event.payload.version.charAt(0).toLowerCase() == "v" ? event.payload.version : "v" + event.payload.version
        if (document.querySelector(".each-page-manage-node-button")) {
            document.querySelectorAll(".each-page-manage-node-button")[3].disabled = (version_new == latest_tag);
        }
        eachSidebarTag[1].textContent = version_new;
        eachSidebarTag[1].classList.add("version-tag");
    }
});

const loadNodePage = async (start) => {
    updateHeader();
    document.querySelector(".all-header-wrapper").setAttribute("style", "display: flex;");
    document.querySelector(".all-login-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".all-node-wrapper").setAttribute("style", "display: unset;");
    document.querySelector(".all-home-wrapper").setAttribute("style", "display: none;");
    document.querySelector(".sidebar-info-details-name").textContent = currentIp.icon;
    document.querySelector(".sidebar-info-icon").setAttribute("src", currentIp.icon ? projects.find(item => item.project.name == currentIp.icon).project.image : "assets/default.png");
    document.querySelector(".sidebar-info-details-copy").setAttribute("style", currentIp.validator_addr ? "display: flex;" : "display: none;");
    document.querySelector(".sidebar-info-details-copy-address").textContent = currentIp.validator_addr;

    if (start) {
        await tauri.invoke("password_keyring_check").then((res) => {
            sessionStorage.setItem("keyring", `{ "required": ${res[0]}, "exists": ${res[1]} }`);
        }).catch((err) => {
            console.log(err);
        });
        await changePage("page-content/node-operations.html", nodeOperationSetup);
        tauri.invoke("cpu_mem_sync");
    }
}
const changePage = async (page, callback) => {
    document.getElementById("content-of-page").innerHTML = await (await fetch(page)).text();
    if (callback) {
        await callback();
    }
};
const createWallet = async (walletname) => {
    document.querySelectorAll(".each-input-field")[0].value = "";
    await tauri.invoke("create_wallet", { walletname: walletname }).then(async (mnemonic) => {
        dialog.message(JSON.parse(mnemonic).mnemonic, { title: "Keep your mnemonic private and secure. It's the only way to acces your wallet.", type: "info" });
    }).catch((err) => {
        console.log(err);
    });
    await showWallets();
};
const showWallets = async () => {
    const walletList = document.getElementById("page-wallet-list");
    await tauri.invoke("show_wallets").then((list) => {
        list = list.length ? JSON.parse(list) : [];
        walletList.innerHTML = list.length == 1 || list.length == 0 ? "<div class='each-row'>No wallets found.</div>" : "";
        count = list.length;
        while (count > 0) {
            row = document.createElement("div");
            row.setAttribute("class", "each-row");

            repeat = count == 1 ? 1 : 2;
            for (let i = 0; i < repeat; i++) {
                if (list[count - i - 1].name == "forkeyringpurpose") {
                    continue;
                }
                halfrow = document.createElement("div");
                halfrow.setAttribute("class", "each-row-half");

                label = document.createElement("div");
                label.setAttribute("class", "each-input-label");

                balancetext = "";
                if (list[count - i - 1].balance.balances.length) {
                    for (let m = 0; m < list[count - i - 1].balance.balances.length; m++) {
                        balancetext += parseInt((list[count - i - 1].balance.balances[m].amount / 1000000) * 100) / 100 + " " + list[count - i - 1].balance.balances[m].denom.slice(1) + "\n";
                    };
                } else {
                    balancetext = "No tokens found.";
                }
                label.textContent = list[count - i - 1].name;

                outputgroup = document.createElement("div");
                outputgroup.setAttribute("class", "each-output-group");
                outputfieldpopup = document.createElement("div");
                outputfieldpopup.setAttribute("class", "each-output-field-pop-up");
                outputfieldpopup.innerText = balancetext;

                outputfield = document.createElement("div");
                outputfield.setAttribute("class", "each-output-field");
                outputfield.textContent = list[count - i - 1].address.substring(0, 4) + "..." + list[count - i - 1].address.substring(list[count - i - 1].address.length - 4);
                outputfield.setAttribute("data", list[count - i - 1].address);

                outputfieldiconcopy = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                outputfieldiconcopy.setAttribute("class", "each-output-field-icon-copy");
                outputfieldiconcopy.setAttribute("viewBox", "0 0 17 16");
                outputfieldiconcopy.addEventListener("click", function () {
                    clipboard.writeText(this.previousSibling.previousSibling.getAttribute("data"));
                    saveforlater = this.previousSibling.previousSibling.textContent;
                    this.previousSibling.previousSibling.textContent = "Copied!";
                    setTimeout(() => {
                        this.previousSibling.previousSibling.textContent = saveforlater;
                    }, 1000);
                });

                path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path1.setAttribute("d", "M14.0555 7.35L11.0055 4.3C10.8555 4.1 10.6055 4 10.3555 4H6.35547C5.80547 4 5.35547 4.45 5.35547 5V14C5.35547 14.55 5.80547 15 6.35547 15H13.3555C13.9055 15 14.3555 14.55 14.3555 14V8.05C14.3555 7.8 14.2555 7.55 14.0555 7.35ZM10.3555 5L13.3055 8H10.3555V5ZM6.35547 14V5H9.35547V8C9.35547 8.55 9.80547 9 10.3555 9H13.3555V14H6.35547Z M3.35547 9H2.35547V2C2.35547 1.45 2.80547 1 3.35547 1H10.3555V2H3.35547V9Z");

                outputfieldicondelete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                outputfieldicondelete.setAttribute("class", "each-output-field-icon-delete");
                outputfieldicondelete.setAttribute("viewBox", "0 0 17 16");
                outputfieldicondelete.addEventListener("click", async function () {
                    if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Wallet", type: "warning" })) {
                        showLoadingAnimation();
                        if (this.previousSibling.previousSibling.previousSibling.getAttribute("data") == document.querySelector(".sidebar-info-details-copy-address").textContent) {
                            document.querySelector(".sidebar-info-details-copy-address").textContent = "";
                            document.querySelector(".sidebar-info-details-copy").setAttribute("style", "display: none;");
                        }
                        await tauri.invoke("delete_wallet", { walletname: this.parentNode.previousSibling.textContent }).catch((err) => { console.log(err) });
                        await showWallets();
                        hideLoadingAnimation();
                    }
                });

                path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path2.setAttribute("d", "M7.35547 6H6.35547V12H7.35547V6Z M10.3555 6H9.35547V12H10.3555V6Z M2.35547 3V4H3.35547V14C3.35547 14.2652 3.46083 14.5196 3.64836 14.7071C3.8359 14.8946 4.09025 15 4.35547 15H12.3555C12.6207 15 12.875 14.8946 13.0626 14.7071C13.2501 14.5196 13.3555 14.2652 13.3555 14V4H14.3555V3H2.35547ZM4.35547 14V4H12.3555V14H4.35547Z M10.3555 1H6.35547V2H10.3555V1Z");

                outputfieldiconcopy.appendChild(path1);
                outputfieldicondelete.appendChild(path2);
                outputgroup.appendChild(outputfield);
                outputgroup.appendChild(outputfieldpopup);
                outputgroup.appendChild(outputfieldiconcopy);
                outputgroup.appendChild(outputfieldicondelete);
                halfrow.appendChild(label);
                halfrow.appendChild(outputgroup);
                row.appendChild(halfrow);
            }
            walletList.appendChild(row);
            count = count - 2;
        }
    }).catch((err) => {
        console.log(err);
    });
};
const handleKeyringExistance = async (page_to_load, setup_func) => {
    if (JSON.parse(sessionStorage.getItem("keyring")).required) {
        if (JSON.parse(sessionStorage.getItem("keyring")).exists) {
            await changePage("page-content/keyring-auth.html", () => keyringAuthSetup(page_to_load, setup_func));
        } else {
            await changePage("page-content/create-keyring.html", () => createKeyringSetup(page_to_load, setup_func));
        }
    } else {
        await changePage(page_to_load, setup_func);
    }
};
const showErrorMessage = (message) => {
    const warningEl = document.getElementById("inner-warning");
    const warningElText = document.getElementById("inner-warning-text");
    warningEl.setAttribute("style", "display: flex;");
    warningEl.classList.add("warning-animation");
    setTimeout(() => {
        warningEl.classList.remove("warning-animation");
    }, 500);
    warningElText.textContent = message;
}

const installationSetup = async () => {
    const progressBarIcons = document.querySelectorAll(".each-progress-bar-status-icon");
    for (let i = 0; i < 100; i++) {
        if (progressBarIcons && (progressBarIcons[0].getAttribute("style") == "display: unset;" || progressBarIcons[1].getAttribute("style") == "display: unset;")) {
            break;
        }
        document.querySelector(".progress-bar").setAttribute("value", i);
        document.querySelector(".progress-bar-text-right").textContent = `${i}%`;
        await new Promise(r => setTimeout(r, i * i / 0.015));
    }
};
const nodeOperationSetup = async () => {
    document.querySelectorAll(".each-page-manage-node-button")[3].disabled = true;
    const client = await http.getClient();
    const repoUrl = projects.find(item => item.project.name === currentIp.icon).project.social_media_accounts.github;
    latest_tag = (await client.get(`https://api.github.com/repos${repoUrl.split("github.com")[1]}/releases/latest`, {
        type: 'Json'
    })).data.name;
    document.querySelectorAll(".each-page-manage-node-button")[0].addEventListener("click", async () => {
        await tauri.invoke("start_stop_restart_node", { action: "start" }).catch((err) => { console.log(err) });
    });
    document.querySelectorAll(".each-page-manage-node-button")[1].addEventListener("click", async () => {
        await tauri.invoke("start_stop_restart_node", { action: "stop" }).catch((err) => { console.log(err) });
    });
    document.querySelectorAll(".each-page-manage-node-button")[2].addEventListener("click", async () => {
        await tauri.invoke("start_stop_restart_node", { action: "restart" }).catch((err) => { console.log(err) });
    });
    document.querySelectorAll(".each-page-manage-node-button")[3].addEventListener("click", async () => {
        await tauri.invoke("update_node", { latest_version: latest_tag }).catch((err) => { console.log(err) });
    });
    document.querySelector(".delete-node-button").addEventListener("click", async () => {
        if (await dialog.ask("This action cannot be reverted. Are you sure?", { title: "Delete Node", type: "warning" })) {
            showLoadingAnimation();
            await tauri.invoke("delete_node").then(async () => {
                currentIp.icon = "Empty Server";
                currentIp.validator_addr = "";
                localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                await tauri.invoke("cpu_mem_sync_stop").then(() => {
                    loadHomePage();
                }).catch((err) => {
                    console.log(err);
                    dialog.message(err, { title: "Error", type: "error" });
                });
            }).catch((err) => {
                console.log(err);
                dialog.message(err, { title: "Error", type: "error" });
            });
        }
    });
    hideLoadingAnimation();
    window.scrollTo(0, 0);
};
const validatorListSetup = async () => {
    showLoadingAnimation();
    await tauri.invoke("validator_list").then((res) => {
        res = res ? JSON.parse(res) : [];
        const contentOfPage = document.getElementById("content-of-page");
        for (let i = 0; i < res.length; i++) {
            valdiv = document.createElement("div");
            valdiv.setAttribute("class", "each-row");

            valname = document.createElement("div");
            valname.setAttribute("class", "each-row-half");
            valname.setAttribute("style", "width: 35%; margin-right: 3%;");
            valname.textContent = res[i].validator;

            valvotingpower = document.createElement("div");
            valvotingpower.setAttribute("class", "each-row-half");
            valvotingpower.setAttribute("style", "width: 25%; margin-right: 3%;");
            valvotingpower.textContent = res[i].voting_power;

            valcommission = document.createElement("div");
            valcommission.setAttribute("class", "each-row-half");
            valcommission.setAttribute("style", "width: 15%; margin-right: 3%;");
            valcommission.textContent = res[i].commission + "%";

            valstaking = document.createElement("div");
            valstaking.setAttribute("class", "each-row-half");
            valstaking.setAttribute("style", "width: 15%;");

            valstakebutton = document.createElement("div");
            valstakebutton.setAttribute("class", "each-button");
            valstakebutton.setAttribute("style", "margin-left: auto;");
            valstakebutton.textContent = "Stake";
            valstakebutton.addEventListener("click", async () => {
                await handleKeyringExistance("page-content/delegate-token.html", () => delegateSetup(res[i].valoper));
            });
            valstaking.appendChild(valstakebutton);

            valdivider = document.createElement("div");
            valdivider.setAttribute("class", "each-row-divider");

            valdiv.appendChild(valname);
            valdiv.appendChild(valvotingpower);
            valdiv.appendChild(valcommission);
            valdiv.appendChild(valstaking);
            valdiv.appendChild(valdivider);
            contentOfPage.appendChild(valdiv);
        }
    }).catch((err) => {
        console.log(err);
        dialog.message(err, { title: "Error", type: "error" });
    });
    hideLoadingAnimation();
    window.scrollTo(0, 400);
};
const createValidatorSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (syncStatusChartPopupText.innerText.includes("Node is synced!")) {
            showLoadingAnimation();
            await tauri.invoke("create_validator", {
                // amount: document.querySelectorAll(".each-input-field")[0].value,
                // walletName: document.querySelectorAll(".each-input-field")[1].value,
                // monikerName: document.querySelectorAll(".each-input-field")[2].value,
                // fees: document.querySelectorAll(".each-input-field")[3].value,
                // website: document.querySelectorAll(".each-input-field")[4].value,
                // keybaseId: document.querySelectorAll(".each-input-field")[5].value,
                // contact: document.querySelectorAll(".each-input-field")[6].value,
                // comRate: document.querySelectorAll(".each-input-field")[7].value,
                // details: document.querySelectorAll(".each-input-field")[8].value,
                website: "node101.io",
                amount: "20",
                walletName: "valitest",
                comRate: "0.05",
                monikerName: "node101",
                keybaseId: "",
                contact: "hello@node101.io",
                fees: "500",
                details: "detailstest",
                projectName: currentIp.icon
            }).then((res) => {
                res = JSON.parse(res);
                if (res.raw_log.length == 2) {
                    dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
                    ipAddresses = ipAddresses.map((item) => {
                        return item.ip === currentIp.ip ? { ...item, validator_addr: res[1].validator_addr } : item;
                    });
                    localStorage.setItem("ipaddresses", JSON.stringify(ipAddresses));
                } else {
                    showErrorMessage(res.raw_log);
                }
            }).catch((err) => {
                console.log(err);
                showErrorMessage(err);
            });
            hideLoadingAnimation();
        } else {
            showErrorMessage("Please wait for the node to sync!");
        }
    });
    window.scrollTo(0, 400);
};
const editValidatorSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (syncStatusChartPopupText.innerText.includes("Node is synced!")) {
            showLoadingAnimation();
            await tauri.invoke("edit_validator", {
                amount: document.querySelectorAll(".each-input-field")[0].value,
                walletName: document.querySelectorAll(".each-input-field")[1].value,
                website: document.querySelectorAll(".each-input-field")[2].value,
                comRate: document.querySelectorAll(".each-input-field")[3].value,
                contact: document.querySelectorAll(".each-input-field")[4].value,
                keybaseId: document.querySelectorAll(".each-input-field")[5].value,
                details: document.querySelectorAll(".each-input-field")[6].value,
            }).then((res) => {
                res = JSON.parse(res);
                if (res.raw_log.length == 2) {
                    dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
                } else {
                    showErrorMessage(res.raw_log);
                }
            }).catch((err) => {
                console.log(err);
                showErrorMessage(err);
            });
            hideLoadingAnimation();
        } else {
            showErrorMessage("Please wait for the node to sync!");
        }
    });
    window.scrollTo(0, 400);
};
const withdrawRewardsSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("withdraw_rewards", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            fees: document.querySelectorAll(".each-input-field")[1].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            }
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const delegateSetup = (valoper) => {
    document.querySelectorAll(".each-input-field")[1].value = valoper;
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("delegate_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            validatorValoper: document.querySelectorAll(".each-input-field")[1].value,
            amount: document.querySelectorAll(".each-input-field")[2].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            }
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const redelegateSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("redelegate_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            destinationValidator: document.querySelectorAll(".each-input-field")[1].value,
            firstValidator: document.querySelectorAll(".each-input-field")[2].value,
            fees: document.querySelectorAll(".each-input-field")[3].value,
            amount: document.querySelectorAll(".each-input-field")[4].value,
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            }
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const voteSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("vote", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            proposalNumber: document.querySelectorAll(".each-input-field")[1].value,
            selectedOption: document.querySelector(".each-input-radio-option:checked").nextElementSibling.textContent.toLowerCase(),
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            }
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const unjailSetup = () => {
};
const sendTokenSetup = () => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("send_token", {
            walletName: document.querySelectorAll(".each-input-field")[0].value,
            receiverAddress: document.querySelectorAll(".each-input-field")[1].value,
            amount: document.querySelectorAll(".each-input-field")[2].value,
            fees: document.querySelectorAll(".each-input-field")[3].value
        }).then((res) => {
            res = JSON.parse(res);
            if (res.raw_log.length == 2) {
                dialog.message("Tx Hash: \n" + res.txhash, { title: "Success", type: "info" });
            } else {
                showErrorMessage(res.raw_log);
            }
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    window.scrollTo(0, 400);
};
const createKeyringSetup = (page_html, page_setup) => {
    document.querySelector(".each-button").addEventListener("click", async () => {
        if (document.querySelectorAll(".each-input-field")[0].value.length < 8) {
            showErrorMessage("Passphrase must be at least 8 characters long!");
        }
        else if (document.querySelectorAll(".each-input-field")[0].value !== document.querySelectorAll(".each-input-field")[1].value) {
            showErrorMessage("Passphrases do not match!");
        }
        else {
            showLoadingAnimation();
            await tauri.invoke("create_keyring", { passphrase: document.querySelector(".each-input-field").value }).then(async () => {
                sessionStorage.setItem("keyring", '{"required": true, "exists": true}');
                await changePage("page-content/keyring-auth.html", () => keyringAuthSetup(page_html, page_setup));
            }).catch((err) => {
                console.log(err);
            });
            hideLoadingAnimation();
        }
    });
    document.querySelectorAll(".each-input-field")[1].addEventListener("keydown", async (e) => {
        if (e.key == "Enter") {
            document.querySelector(".each-button").click();
        }
    });
    window.scrollTo(0, 400);
};
const keyringAuthSetup = (page_html, page_setup) => {
    document.querySelector(".each-input-helper-text").addEventListener("click", async () => {
        if (await dialog.ask("This action will delete all the wallets. Are you sure you want to continue?", { title: "Reset Keyring", type: "warning" })) {
            showLoadingAnimation();
            await tauri.invoke("delete_keyring").then(async () => {
                sessionStorage.setItem("keyring", '{"required": true, "exists": false}');
                await changePage("page-content/create-keyring.html", () => createKeyringSetup(page_html, page_setup));
            }).catch((err) => {
                console.log(err);
            });
            hideLoadingAnimation();
        }
    });
    document.querySelector(".each-button").addEventListener("click", async () => {
        showLoadingAnimation();
        await tauri.invoke("check_keyring_passphrase", { passw: document.querySelectorAll(".each-input-field")[0].value }).then(async () => {
            await changePage(page_html, page_setup);
        }).catch((err) => {
            console.log(err);
            showErrorMessage(err);
        });
        hideLoadingAnimation();
    });
    document.querySelector(".each-input-field").addEventListener("keydown", async (e) => {
        if (e.key == "Enter") {
            document.querySelector(".each-button").click();
        }
    });
    window.scrollTo(0, 400);
};
const walletsSetup = async () => {
    showLoadingAnimation();
    await showWallets();
    document.querySelector(".each-mnemonic-input-field").addEventListener("paste", function () {
        setTimeout(() => {
            if (this.value.split(" ").length == 24) {
                mnemo = this.value.split(" ");
                document.querySelectorAll(".each-mnemonic-input-field").forEach((element, index) => {
                    element.value = mnemo[index];
                });
            }
        }, 100);
    });
    document.querySelectorAll(".each-button")[0].addEventListener("click", async function () {
        showLoadingAnimation();
        const walletname = document.querySelectorAll(".each-input-field")[0].value;
        if (await tauri.invoke("if_wallet_exists", { walletname: walletname }).catch((err) => { console.log(err); })) {
            if (await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
                await tauri.invoke("delete_wallet", { walletname: walletname }).catch((err) => { console.log(err); });
                await createWallet(walletname);
            }
        }
        else {
            await createWallet(walletname);
        }
        hideLoadingAnimation();
    });
    document.querySelectorAll(".each-button")[1].addEventListener("click", async function () {
        showLoadingAnimation();
        const walletname = document.querySelectorAll(".each-input-field")[1];
        const mnemonic = Array.from(document.querySelectorAll(".each-mnemonic-input-field")).map(input => input.value).join(" ");
        if (await tauri.invoke("if_wallet_exists", { walletname: walletname.value }).catch((err) => { console.log(err); })) {
            if (await dialog.ask("This action will override the existing wallet. Are you sure?", { title: "Override Wallet", type: "warning" })) {
                await tauri.invoke("delete_wallet", { walletname: walletname.value }).catch((err) => { console.log(err); });
                await tauri.invoke("recover_wallet", { walletname: walletname.value, mnemo: mnemonic, passwordneed: JSON.parse(sessionStorage.getItem("keyring")).required }).catch((err) => { console.log(err); });
            }
        } else {
            await tauri.invoke("recover_wallet", { walletname: walletname.value, mnemo: mnemonic, passwordneed: JSON.parse(sessionStorage.getItem("keyring")).required }).catch((err) => { console.log(err); });
        }
        await showWallets();
        walletname.value = "";
        document.querySelectorAll(".each-mnemonic-input-field").forEach(element => {
            element.value = "";
        });
        hideLoadingAnimation();
    });
    hideLoadingAnimation();
    window.scrollTo(0, 400);
};

const setupNodePage = () => {
    const validatorAddress = document.querySelector(".sidebar-info-details-copy");
    const validatorAddressText = document.querySelector(".sidebar-info-details-copy-address");
    const validatorOperationsButton = document.getElementById("validator-operations-button");
    const validatorOperationsArrow = document.querySelector(".each-dropdown-button-arrow");
    const nodeInformationButton = document.getElementById("node-information-button");
    const subButtonsDiv = document.querySelector(".sidebar-dropdown-subbuttons");
    const homePageButton = document.getElementById("home-page-button");
    const nodeOperationsButton = document.getElementById("node-operations-button");
    const validatorListButton = document.getElementById("validator-list-button");
    const createValidatorButton = document.getElementById("create-validator-button");
    const editValidatorButton = document.getElementById("edit-validator-button");
    const withdrawRewardsButton = document.getElementById("withdraw-rewards-button");
    const unjailButton = document.getElementById("unjail-button");
    const delegateTokenButton = document.getElementById("delegate-token-button");
    const sendTokenButton = document.getElementById("send-token-button");
    const redelegateTokenButton = document.getElementById("redelegate-token-button");
    const voteButton = document.getElementById("vote-button");
    const walletsButton = document.getElementById("wallets-button");

    syncStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[0], {
        size: 160,
        barColor: "rgba(15, 98, 254, 1)",
        scaleLength: 0,
        lineWidth: 6,
        trackColor: "#373737",
        lineCap: "circle",
        animate: 2000,
    });

    syncStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[0];
    syncStatusChartPopupText = document.querySelector(".each-page-chart-text-pop-up");
    cpuStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[1], {
        size: 160,
        barColor: "rgba(15, 98, 254, 1)",
        scaleLength: 0,
        lineWidth: 6,
        trackColor: "#373737",
        lineCap: "circle",
        animate: 2000,
    });

    cpuStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[1];
    memStatusChart = new EasyPieChart(document.querySelectorAll(".each-page-chart")[2], {
        size: 160,
        barColor: "rgba(15, 98, 254, 1)",
        scaleLength: 0,
        lineWidth: 6,
        trackColor: "#373737",
        lineCap: "circle",
        animate: 2000,
    });

    memStatusChartPercent = document.querySelectorAll(".each-page-chart-percentage")[2];
    validatorAddress.addEventListener("click", function () {
        clipboard.writeText(validatorAddressText.innerText);
        saveforlater = validatorAddressText.innerText;
        validatorAddressText.innerText = "Copied!";
        setTimeout(() => {
            validatorAddressText.innerText = saveforlater;
        }, 1000);
    });

    nodeOperationsButton.addEventListener("click", async function () {
        await changePage("page-content/node-operations.html", nodeOperationSetup);
    });
    homePageButton.addEventListener("click", async function () {
        showLoadingAnimation();
        await tauri.invoke("cpu_mem_sync_stop").then(() => {
            loadHomePage();
        }).catch((err) => {
            console.log(err);
            dialog.message(err, { title: "Error", type: "error" });
        });
    });
    validatorOperationsButton.addEventListener("click", function () {
        if (window.getComputedStyle(subButtonsDiv).getPropertyValue("display") == "none") {
            subButtonsDiv.setAttribute("style", "display: block");
            validatorOperationsArrow.setAttribute("style", "transform: rotate(-180deg); transition: 0.5s;");
        }
        else {
            validatorOperationsArrow.setAttribute("style", "transform: rotate(0); transition: 0.5s;");
            subButtonsDiv.setAttribute("style", "display: none");
        }
    });
    validatorListButton.addEventListener("click", async function () {
        await changePage("page-content/validator-list.html", validatorListSetup);
    });
    createValidatorButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/create-validator.html", createValidatorSetup);
    });
    editValidatorButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/edit-validator.html", editValidatorSetup);
    });
    withdrawRewardsButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/withdraw-rewards.html", withdrawRewardsSetup);
    });
    delegateTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/delegate-token.html", () => delegateSetup(""));
    });
    redelegateTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/redelegate-token.html", redelegateSetup);
    });
    voteButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/vote.html", voteSetup);
    });
    unjailButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/unjail.html", unjailSetup);
    });
    sendTokenButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/send-token.html", sendTokenSetup);
    });
    walletsButton.addEventListener("click", async function () {
        await handleKeyringExistance("page-content/wallets.html", walletsSetup);
    });
    nodeInformationButton.addEventListener("click", async function () {
        showLoadingAnimation();
        await tauri.invoke("node_info").then(async (obj) => {
            console.log(obj);
            await changePage("page-content/node-information.html");
            const fields = document.querySelectorAll(".each-output-field");
            obj = JSON.parse(obj);
            fields[0].textContent = obj.NodeInfo.protocol_version.p2p;
            fields[1].textContent = obj.NodeInfo.protocol_version.block;
            fields[2].textContent = obj.NodeInfo.protocol_version.app;
            fields[3].textContent = obj.NodeInfo.id;
            fields[4].textContent = obj.NodeInfo.listen_addr;
            fields[5].textContent = obj.NodeInfo.network;
            fields[6].textContent = obj.NodeInfo.version;
            fields[7].textContent = obj.NodeInfo.channels;
            fields[9].textContent = obj.NodeInfo.moniker;
            fields[10].textContent = obj.NodeInfo.other.tx_index;
            fields[11].textContent = obj.NodeInfo.other.rpc_address;
            fields[12].textContent = obj.SyncInfo.latest_block_hash;
            fields[13].textContent = obj.SyncInfo.latest_app_hash;
            fields[14].textContent = obj.SyncInfo.latest_block_height;
            fields[15].textContent = obj.SyncInfo.latest_block_time;
            fields[16].textContent = obj.SyncInfo.earliest_block_hash;
            fields[17].textContent = obj.SyncInfo.earliest_app_hash;
            fields[18].textContent = obj.SyncInfo.earliest_block_height;
            fields[19].textContent = obj.SyncInfo.earliest_block_time;
            fields[20].textContent = obj.SyncInfo.catching_up;
            fields[21].textContent = obj.ValidatorInfo.Address;
            fields[22].textContent = obj.ValidatorInfo.PubKey.type;
            fields[23].textContent = obj.ValidatorInfo.PubKey.value;
            fields[24].textContent = obj.ValidatorInfo.VotingPower;
            hideLoadingAnimation();
            window.scrollTo(0, 400);
        }).catch((err) => {
            console.log(err);
            dialog.message(err, { title: "Error", type: "error" });
            hideLoadingAnimation();
        });
    });
};