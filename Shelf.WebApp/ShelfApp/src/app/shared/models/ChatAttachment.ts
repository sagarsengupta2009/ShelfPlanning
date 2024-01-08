export interface ChatAttachment {
  attachmentId: number;
  fileName: string;
  url: any;
  extension: string;
}

export interface ChatAttachments {
  user: string;
  attachments: ChatAttachment[];
  message: string;
  messageId: string;
  noOfPogs: string;
  createdOn: string;
}
