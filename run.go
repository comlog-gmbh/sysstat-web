ex, err := os.Executable()
if err != nil {
	panic(err)
}
exPath := filepath.Dir(ex)
