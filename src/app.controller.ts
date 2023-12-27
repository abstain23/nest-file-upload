import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: 'upload',
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);
    const fileName = body.name.match(/(.+)\-\d+$/)[1];
    const chunkDir = 'upload/chunks_' + fileName;
    if (!fs.existsSync(chunkDir)) {
      await fs.promises.mkdir(chunkDir);
    }
    await fs.promises.cp(files[0].path, chunkDir + '/' + body.name);
    console.log('path', files[0].path);
    await fs.promises.rm(files[0].path);
    return 'ok';
  }

  @Get('merge')
  async mergeFiles(@Query('file_name') fileName: string) {
    fileName = decodeURIComponent(fileName);
    const chunkDir = 'upload/chunks_' + fileName;
    const files = await fs.promises.readdir(chunkDir);
    console.log('files', files);
    let startPos = 0;
    let count = 0;
    files.forEach((file) => {
      const filePath = chunkDir + '/' + file;
      const stream = fs.createReadStream(filePath);
      stream
        .pipe(
          fs.createWriteStream('upload/' + fileName, {
            start: startPos,
          }),
        )
        .on('finish', () => {
          count += 1;
          if (count === files.length) {
            fs.promises.rm(chunkDir, {
              recursive: true,
            });
          }
        });
      startPos += fs.statSync(filePath).size;
    });
  }
}
