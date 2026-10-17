# Espressoir's own native helpers, kept beside the app instead of a third-party package.
Pod::Spec.new do |s|
  s.name         = "EspressoirNative"
  s.version      = "0.1.0"
  s.summary      = "Photo shrinking for the Espressoir app."
  s.homepage     = "https://espressoir.com"
  s.license      = { :type => "UNLICENSED" }
  s.authors      = "Espressoir"
  s.platforms    = { :ios => "17.0" }
  s.source       = { :path => "." }
  s.source_files = "*.{h,m,mm}"

  if defined?(install_modules_dependencies) != nil
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
