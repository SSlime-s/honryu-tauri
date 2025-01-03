use image::RgbaImage;

struct MonitorInfo {
    xy: (i32, i32),
    wh: (u32, u32),
    image: RgbaImage,
}
struct VirtualImageSize {
    xy: (i32, i32),
    wh: (u32, u32),
}
pub struct VirtualImage {
    pub xy: (i32, i32),
    pub wh: (u32, u32),
    pub image: RgbaImage,
}

pub fn take_screen_shot() -> anyhow::Result<VirtualImage> {
    let monitors = xcap::Monitor::all()?;
    let monitor_infos = monitors
        .into_iter()
        .map(|monitor| {
            let image = monitor.capture_image()?;
            Ok(MonitorInfo {
                xy: (monitor.x(), monitor.y()),
                wh: (monitor.width(), monitor.height()),
                image,
            })
        })
        .collect::<anyhow::Result<Vec<_>>>()?;
    let monitor_infos = monitor_infos.iter().map(process_image).collect::<Vec<_>>();
    let merged_image = merge_images(&monitor_infos)?;

    Ok(merged_image)
}

/**
 * Calculate the size that encompasses all the monitors.
 */
fn get_whole_size(monitor_infos: &[MonitorInfo]) -> anyhow::Result<VirtualImageSize> {
    let x = monitor_infos
        .iter()
        .map(|info| info.xy.0)
        .min()
        .ok_or(anyhow::anyhow!("error in calculating x"))?;
    let y = monitor_infos
        .iter()
        .map(|info| info.xy.1)
        .min()
        .ok_or(anyhow::anyhow!("error in calculating y"))?;
    let w = monitor_infos
        .iter()
        .map(|info| info.xy.0 + info.wh.0 as i32)
        .max()
        .ok_or(anyhow::anyhow!("error in calculating w"))?
        - x;
    let h = monitor_infos
        .iter()
        .map(|info| info.xy.1 + info.wh.1 as i32)
        .max()
        .ok_or(anyhow::anyhow!("error in calculating h"))?
        - y;

    Ok(VirtualImageSize {
        xy: (x, y),
        wh: (w as u32, h as u32),
    })
}
fn merge_images(monitor_infos: &[MonitorInfo]) -> anyhow::Result<VirtualImage> {
    let VirtualImageSize { xy, wh } = get_whole_size(monitor_infos)?;
    let mut image = RgbaImage::new(wh.0, wh.1);
    for info in monitor_infos {
        image::imageops::overlay(
            &mut image,
            &info.image,
            (info.xy.0 - xy.0) as i64,
            (info.xy.1 - xy.1) as i64,
        );
    }
    Ok(VirtualImage { xy, wh, image })
}
/**
 * if MacOS, screenshot based on PhysicalSize. Therefore, image resize to LogicalSize.
 */
fn process_image(monitor_info: &MonitorInfo) -> MonitorInfo {
    let new_image = image::imageops::resize(
        &monitor_info.image,
        monitor_info.wh.0,
        monitor_info.wh.1,
        image::imageops::FilterType::Nearest,
    );

    MonitorInfo {
        xy: monitor_info.xy,
        wh: monitor_info.wh,
        image: new_image,
    }
}
