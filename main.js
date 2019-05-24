const {app, BrowserWindow} = require('electron');

const ipcMain = require('electron').ipcMain;
const exec = require('child_process').exec;

let {win, cmd, ipCmd, serverPID} = {};
let iconv = require('iconv-lite');

let createWindow = () => {
    win = new BrowserWindow({
        width: 800,
        height: 600,
        center: true,
        webPreferences: {
            nodeIntegration: true,
            devTools: false,
        },
    });
    handleEvent();
    win.removeMenu();
    win.loadFile('resource/index.html').then(() => win.webContents.openDevTools());
};

let handleEvent = () => {
    ipcMain.on('run', () => handleServer(true));
    ipcMain.on('stop', () => handleServer(false));
    ipcMain.on('openFolder', () => exec('start D:/_the_filer_upload'));
};

let handleServer = (run) => {
    if (run) {
        cmd = exec('java -jar resource/server/the_filer-1.2.jar', {encoding: 'GBK'});
        cmd.stdout.on('data', log => {
            if (log.indexOf('Starting TheFilerApplication v1.2 on') > 0) {
                serverPID = log.toString().match(/with PID (\d+)/)[1];
                win.webContents.send('serverPID', serverPID);
            }
            if (log.indexOf('Tomcat started on port(s): ') > 0) {
                win.webContents.send('serverPort', log.toString().match(/port\(s\): (\d+)/)[1]);
            }
            win.webContents.send('runLog', iconv.decode(log, 'GBK'));
        });
        win.webContents.send('runDone');

        if (!ipCmd) {
            ipCmd = exec('cd resource/server && ip');
            ipCmd.stdout.on('data', log => win.webContents.send('serverIP', log.trim()));
        }
    } else {
        if (serverPID) {
            exec('taskkill /pid ' + serverPID + ' -t /f');
        }
        win.webContents.send('stopDone', new Date().toLocaleString() + (serverPID ? ' 程序已结束' : ' 程序未开始'));
    }
};

app.on('ready', createWindow);
app.on('will-quit', () => {
    if (serverPID) {
        handleServer(false)
    }
    win = null;
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});
