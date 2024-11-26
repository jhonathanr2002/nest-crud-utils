import { ApiProperty } from "@nestjs/swagger";

export class UploadFileSwaggerDto {
    @ApiProperty({ type: "string", format: "binary" })
    file: Express.Multer.File;
}
