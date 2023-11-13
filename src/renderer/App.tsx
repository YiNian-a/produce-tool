import { useEffect, useState } from 'react';
import { Select, Form, InputNumber, Button, message } from 'antd';
import postSn from './service/api';
import './App.css';

export default function App() {
  const [postOptions, setPostOptions] = useState<any>([]);
  const [postParams, setPostParams] = useState<any>({});
  const [printersOptions, setPrintersOptions] = useState<any>([]);
  const [isSelect, setIsSelect] = useState<boolean>(false);
  const [connectDisabled, setConnectDisabled] = useState<boolean>(true);
  const [snDisabled, setSnDisabled] = useState<boolean>(true);
  const [formDisabled, setFormDisabled] = useState<boolean>(true);
  const [isSet, setIsSet] = useState<boolean>(true);
  const [deviceSn, setDeviceSn] = useState<any>('');
  const [motherboardSn, setMotherboardSn] = useState<string>('');
  const [printParams, setPrintParams] = useState<any>(undefined);
  const handlePrintersGet = async () => {
    const resp = await window.electron.getInitData();
    if (resp) {
      const newPostsArr = resp.posts.map((post: any) => {
        return { value: post.path, label: post.friendlyName };
      });
      setPostOptions(newPostsArr);
      const newPrintersArr = resp.printers.map((printer: any) => {
        return { value: printer.name, label: printer.displayName };
      });
      setPrintersOptions(newPrintersArr);
      setPrintParams(resp.printerParams);
    }
  };
  useEffect(() => {
    handlePrintersGet();
  }, []);

  useEffect(() => {
    if (!snDisabled) {
      window.electron.transmitMessages.on('message-reply', (arg) => {
        setDeviceSn(arg);
      });
    }
  }, [snDisabled]);

  const handleChoosePort = (value: any) => {
    setConnectDisabled(false);
    setPostParams({
      path: value,
      baudRate: 2000000,
      autoOpen: true,
    });
  };

  const handleConnect = async () => {
    window.electron.connectPort.sendMessage('connect-send', postParams);
    window.electron.connectPort.once('connect-reply', (arg) => {
      if (arg === 'true') {
        message.success('串口连接成功！');
        setIsSelect(true);
        setSnDisabled(false);
      } else {
        message.error('连当前串口号无法打开！请检查后重新打开！');
      }
    });
  };

  const handleConnectCancel = async () => {
    window.electron.cancelConnect.sendMessage('disconnect-send');
    window.electron.cancelConnect.once('disconnect-reply', (arg) => {
      if (arg === 'true') {
        message.success('取消连接成功！');
        setIsSelect(false);
        setSnDisabled(true);
      } else {
        message.error('取消连接失败！');
      }
    });
  };

  const handleSnGet = () => {
    window.electron.transmitMessages.sendMessage('message-send', 'AT+SN=?');
  };

  const handleUploadData = async () => {
    const params = {
      deviceSn,
      bsn: motherboardSn,
    };
    try {
      const res = await postSn(params);
      if (res.msg === 'OK') {
        message.success('上传成功！');
      }
    } catch (error: any) {
      console.log(error);
      message.error(error.response.data.msg);
    }
  };

  const print = () => {
    if (deviceSn === '' || !deviceSn) {
      message.warning('请先获取序列号！');
      return;
    }
    if (!printParams) {
      message.warning('请先设置打印机参数！');
      return;
    }
    printParams.deviceSn = deviceSn;
    window.electron.transmitCodeSn.sendMessage('codesn-send', printParams);
    console.log('mainpage向主进程发送序列号');
    window.electron.ipcRenderer.once('print-sn', (arg) => {
      console.log('监听打印是否成功', arg);
      if (arg === 'true') {
        message.success('正在打印中，请稍后...');
      } else {
        message.error(arg);
      }
    });
  };

  const handlePrinterParamsSet = (value: any) => {
    const vals = {
      printerName: value.printerName,
      width: value.width * 1000,
      height: value.height * 1000,
      count: value.count,
    };
    setPrintParams(vals);
    window.electron.paramsStore.sendParams('params-send', vals);
    setFormDisabled(true);
    setIsSet(true);
  };
  return (
    <div className="mainPage">
      <div className="leftContent">
        <div className="selectBox">
          <h4 style={{ marginBottom: 6, marginTop: 0 }}>选择串口</h4>
          <Select
            className="portSelect"
            placeholder="请选择一个串口"
            disabled={isSelect}
            onChange={handleChoosePort}
            options={postOptions}
          />
        </div>
        <div className="btnBox">
          {isSelect ? (
            <Button className="connectbtn" onClick={handleConnectCancel}>
              取消连接
            </Button>
          ) : (
            <Button
              className="connectbtn"
              onClick={handleConnect}
              disabled={connectDisabled}
            >
              连接
            </Button>
          )}

          <Button
            className="connectbtn"
            onClick={handleSnGet}
            disabled={snDisabled}
          >
            获取序列号
          </Button>
        </div>
      </div>
      <div className="rightContent">
        <div className="snContent">
          <Form
            name="sn"
            layout="horizontal"
            style={{ maxWidth: 600 }}
            autoComplete="off"
            onFinish={handleUploadData}
          >
            <Form.Item
              name="deviceSn"
              className="deviceSnbox"
              rules={[
                { required: true && !deviceSn, message: '请录入设备序列号!' },
              ]}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}
              >
                <div>
                  {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                  <label htmlFor="deviceSn">设备序列号：</label>
                  <input
                    type="text"
                    id="deviceSn"
                    className="snInput"
                    value={deviceSn}
                    onChange={(e) => setDeviceSn(e.target.value)}
                  />
                </div>
                <Button style={{ marginLeft: 10 }} onClick={print}>
                  打印设备号
                </Button>
              </div>
            </Form.Item>
            <Form.Item
              name="motherboardSn"
              rules={[
                {
                  required: true && !motherboardSn,
                  message: '请录入主板序列号!',
                },
              ]}
            >
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label htmlFor="motherboardSn">主板序列号：</label>
              <input
                type="text"
                id="motherboardSn"
                className="snInput"
                value={motherboardSn}
                onChange={(e) => setMotherboardSn(e.target.value)}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                上传数据
              </Button>
            </Form.Item>
          </Form>
        </div>
        <div className="setContent">
          <div className="setRow">
            <h3 style={{ margin: 0 }}>打印设置</h3>
            {isSet ? (
              <Button
                type="primary"
                onClick={() => {
                  setFormDisabled(false);
                  setIsSet(false);
                }}
              >
                设置
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setFormDisabled(true);
                  setIsSet(true);
                }}
              >
                退出设置
              </Button>
            )}
          </div>
          {printParams && (
            <Form
              name="setting"
              layout="horizontal"
              disabled={formDisabled}
              style={{ maxWidth: 600 }}
              autoComplete="off"
              onFinish={handlePrinterParamsSet}
            >
              <Form.Item
                name="printerName"
                label="打印机"
                initialValue={printParams && printParams.printerName}
                rules={[{ required: true, message: '请选择打印机!' }]}
              >
                <Select
                  placeholder="请选择一个打印机"
                  style={{ width: 220 }}
                  // onChange={handleChange}
                  options={printersOptions}
                />
              </Form.Item>
              <Form.Item
                name="width"
                label="打印机宽度"
                initialValue={printParams && printParams.width / 1000}
                rules={[{ required: true, message: '请设置打印机宽度!' }]}
              >
                <InputNumber
                  placeholder="宽度"
                  addonAfter="毫米"
                  style={{ width: 150 }}
                  min={20}
                />
              </Form.Item>
              <Form.Item
                name="height"
                label="打印机高度"
                initialValue={printParams && printParams.height / 1000}
                rules={[{ required: true, message: '请设置打印机高度!' }]}
              >
                <InputNumber
                  placeholder="高度"
                  addonAfter="毫米"
                  min={10}
                  style={{ width: 150 }}
                />
              </Form.Item>
              <Form.Item
                name="count"
                label="打印份数"
                initialValue={printParams && printParams.count}
                rules={[{ required: true, message: '请设置打印份数!' }]}
              >
                <InputNumber placeholder="份数" autoComplete="off" min={1} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  提交设置
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
