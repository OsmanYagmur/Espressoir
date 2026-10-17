#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

/// Shrinks a picture for upload: draws it upright, no larger than the given box, and saves it
/// as JPEG in the temporary folder. UIImageJPEGRepresentation writes the pixels only, so the
/// camera's metadata (location, device, time) stays behind; the app checks the bytes anyway.
@interface ImageShrinker : NSObject <RCTBridgeModule>
@end

@implementation ImageShrinker

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(shrink:(NSString *)uri
                  maxWidth:(double)maxWidth
                  maxHeight:(double)maxHeight
                  quality:(double)quality
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  NSURL *url = [NSURL URLWithString:uri];
  NSData *data = url.isFileURL ? [NSData dataWithContentsOfURL:url] : nil;
  UIImage *image = data ? [UIImage imageWithData:data] : nil;
  if (image == nil || image.size.width <= 0 || image.size.height <= 0) {
    reject(@"unreadable", @"The picture could not be read.", nil);
    return;
  }

  // image.size already accounts for the orientation the camera recorded.
  CGSize size = image.size;
  double scale = MIN(1.0, MIN(maxWidth / size.width, maxHeight / size.height));
  CGSize target = CGSizeMake(MAX(1, floor(size.width * scale)), MAX(1, floor(size.height * scale)));

  UIGraphicsImageRendererFormat *format = [UIGraphicsImageRendererFormat preferredFormat];
  format.scale = 1;
  format.opaque = YES;
  UIGraphicsImageRenderer *renderer = [[UIGraphicsImageRenderer alloc] initWithSize:target format:format];
  UIImage *resized = [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
    [[UIColor whiteColor] setFill];
    [context fillRect:CGRectMake(0, 0, target.width, target.height)];
    [image drawInRect:CGRectMake(0, 0, target.width, target.height)];
  }];

  NSData *jpeg = UIImageJPEGRepresentation(resized, MAX(0.05, MIN(1.0, quality)));
  NSString *name = [[[NSUUID UUID] UUIDString] stringByAppendingPathExtension:@"jpg"];
  NSString *path = [NSTemporaryDirectory() stringByAppendingPathComponent:name];
  if (jpeg == nil || ![jpeg writeToFile:path atomically:YES]) {
    reject(@"write", @"The picture could not be saved.", nil);
    return;
  }
  resolve(@{
    @"uri" : [NSURL fileURLWithPath:path].absoluteString,
    @"width" : @(target.width),
    @"height" : @(target.height),
    @"size" : @(jpeg.length),
  });
}

@end
