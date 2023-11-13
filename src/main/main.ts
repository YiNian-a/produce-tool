/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { ReadlineParser, SerialPort } from 'serialport';
import Store from 'electron-store';
// import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let childWindow: BrowserWindow | null = null;
let curport: any;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  mainWindow.removeMenu();

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  childWindow = new BrowserWindow({
    show: false,
    width: 76,
    height: 130,
    parent: mainWindow,
    webPreferences: {
      // webSecurity: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  childWindow.loadURL(resolveHtmlPath('child.html'));
  childWindow.hide();

  childWindow.on('ready-to-show', () => {
    if (!childWindow) {
      throw new Error('childWindow is not defined');
    }
    if (process.env.START_MINIMIZED) {
      childWindow.minimize();
    } else {
      childWindow.show();
    }
  });

  childWindow.on('closed', () => {
    childWindow = null;
  });

  // Open urls in the user's browser
  childWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // mainWindow.webContents.openDevTools();
  // childWindow.webContents.openDevTools();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    // 创建窗口
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);

// 页面初始化返回 端口列表和打印机列表
ipcMain.handle('init-data', async () => {
  const printers = await mainWindow?.webContents.getPrintersAsync();
  const posts = await SerialPort.list();
  const store = new Store();
  const printerParams = store.get('params-store');
  const data: any = {
    printers,
    posts,
    printerParams: printerParams || {},
  };
  return data;
});
function handleport(event: any) {
  const parser = curport.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  parser.on('data', (data: any) => {
    if (data.includes('AT+SN=')) {
      const newdata = data.split('=')[1];
      event.sender.send('message-reply', newdata);
    }
    return console.log(data);
  });
}
// 监听连接串口进程
ipcMain.on('connect-send', async (event, vals) => {
  curport = new SerialPort(vals, (err: Error | null) => {
    if (err) {
      event.sender.send('connect-reply', err);
      return console.log(err);
    }
    event.sender.send('connect-reply', 'true');
    handleport(event);
    return console.log('success connect');
  });
  // await curport.open();
  return true;
});
// 监听取消串口连接进程
ipcMain.on('disconnect-send', async (event) => {
  await curport.close((err: Error | null) => {
    if (err) {
      event.sender.send('disconnect-reply', err);
      return console.log(err);
    }
    event.sender.send('disconnect-reply', 'true');
    return console.log('cancel connect success');
  });
});

// 监听渲染进程发送的获取设备序列号指令
ipcMain.on('message-send', async (event, arg) => {
  curport.write(arg, (err: any) => {
    if (err) {
      return console.log('Error on write: ', err.message);
    }
    return console.log(`send: ${arg}`);
  });
});
// 监听mainpage打印命令传输过来的序列号，并传输给printCodePage页面
ipcMain.on('codesn-send', async (event, arg) => {
  childWindow?.webContents.send('codesn-reply', arg);
});

// 监听打印命令
ipcMain.on('print-sn', async (event, arg) => {
  childWindow?.webContents.print(
    {
      deviceName: arg.printerName,
      pageSize: {
        width: arg.width,
        height: arg.height,
      },
      silent: true,
      copies: arg.count,
    },
    (success: boolean, reason: string) => {
      if (success) {
        event.sender.send('print-sn', 'true');
        return console.log(success);
      }
      event.sender.send('print-sn', reason);
      return console.log(reason);

      // event.sender.send('disconnect-reply', 'true');
    },
  );
});
// 监听渲染程序传输过来的打印机设置
ipcMain.on('params-send', async (event, arg) => {
  const store = new Store();
  // store.delete('params-store');
  store.set('params-store', arg);
});
