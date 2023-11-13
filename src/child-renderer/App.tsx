import { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';

export default function App() {
  const [data, setData] = useState<any>();
  useEffect(() => {
    window.electron.transmitCodeSn.on('codesn-reply', (arg: any) => {
      setData(arg);
      console.log('收到主进程传来的打印数据');
      const sn = arg.deviceSn;
      JsBarcode('#barcode', sn, {
        displayValue: true,
        width: 2,
        height: 60,
        margin: 0,
        fontSize: 12,
      });
    });
  }, []);

  const handlePrinter = () => {
    window.electron.ipcRenderer.sendMessage('print-sn', data);
    console.log('二维码加载完成后向主进程发送调用打印机的信号');
  };
  return (
    <div>
      <img
        id="barcode"
        onLoad={handlePrinter}
        alt="DesiceSn"
        style={{ width: '100%' }}
      />
    </div>
  );
}
