import { request } from './request';

export default async function postSn(val: any): Promise<any> {
  return request({
    url: '/mes/v1/relateBsn',
    method: 'POST',
    data: {
      ...val,
    },
  });
}
